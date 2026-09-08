import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { runMigrations } from "./migrate.mjs";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";

async function assertMigrationLockReleased(client) {
	const [locks] = await client`SELECT count(*)::int AS count FROM pg_locks
		WHERE locktype = 'advisory' AND objid = 182734091
		AND database = (SELECT oid FROM pg_database WHERE datname = current_database())`;
	assert.equal(locks.count, 0, "Migration advisory lock must be released");
}

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
const admin = postgres(process.env.TEST_DATABASE_URL, { max: 1 });
const name = `migration_test_${randomUUID().replaceAll("-", "")}`;
let client;
try {
	await admin.unsafe(`CREATE DATABASE "${name}"`);
	const url = new URL(process.env.TEST_DATABASE_URL);
	url.pathname = `/${name}`;
	client = postgres(url.toString(), { max: 4, onnotice: () => {} });
	await Promise.all(Array.from({ length: 4 }, () => runMigrations(client)));
	await assertMigrationLockReleased(client);
	await runMigrations(client);
	const [history] = await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
	assert.equal(history.count, readMigrationFiles({ migrationsFolder: "./drizzle" }).length);
	// Force a failure in normal migrations, after compatibility handling returns.
	const entries = await client`SELECT id, created_at FROM drizzle.__drizzle_migrations`;
	await client`UPDATE drizzle.__drizzle_migrations SET created_at = 0`;
	await assert.rejects(runMigrations(client));
	await assertMigrationLockReleased(client);
	for (const entry of entries) {
		await client`UPDATE drizzle.__drizzle_migrations SET created_at = ${entry.created_at} WHERE id = ${entry.id}`;
	}
	const [user] =
		await client`INSERT INTO users (email) VALUES ('migration-test@example.invalid') RETURNING id`;
	const [budget] =
		await client`INSERT INTO budgets (users_id, amount, period) VALUES (${user.id}, 100, 'monthly') RETURNING id`;
	await client`SET TIME ZONE 'Pacific/Auckland'`;
	await client`INSERT INTO budget_alerts (budgets_id, users_id, alert_type, sent_at, spending_at_alert) VALUES (${budget.id}, ${user.id}, 'threshold', '2026-09-08T00:01:00Z', 80)`;
	await client`SET TIME ZONE 'America/Los_Angeles'`;
	await assert.rejects(
		client`INSERT INTO budget_alerts (budgets_id, users_id, alert_type, sent_at, spending_at_alert) VALUES (${budget.id}, ${user.id}, 'threshold', '2026-09-08T23:59:00Z', 90)`,
		{ code: "23505" },
	);
	await client`INSERT INTO budget_alerts (budgets_id, users_id, alert_type, sent_at, spending_at_alert) VALUES (${budget.id}, ${user.id}, 'threshold', '2026-09-09T00:01:00Z', 90)`;
	const budgetsTest = spawnSync("node_modules/.bin/tsx", ["scripts/test-budget-creation.ts"], {
		env: { ...process.env, DATABASE_URL: url.toString() },
		stdio: "inherit",
	});
	assert.equal(budgetsTest.status, 0, "Budget creation regressions");
	const goalsTest = spawnSync("node_modules/.bin/tsx", ["scripts/test-goals.ts"], {
		env: { ...process.env, DATABASE_URL: url.toString() },
		stdio: "inherit",
	});
	assert.equal(goalsTest.status, 0, "Goals regressions");

	// Reproduce a preserved baseline database, before goals, with no migration history.
	await client`DROP TABLE goals`;
	await client`DROP TYPE goal_status`;
	await client`DROP SCHEMA drizzle CASCADE`;
	await assert.rejects(
		migrate((await import("drizzle-orm/postgres-js")).drizzle(client), {
			migrationsFolder: "./drizzle",
		}),
	);
	await runMigrations(client);
	const [preserved] = await client`SELECT count(*)::int AS count FROM budget_alerts`;
	assert.equal(preserved.count, 2);
	const [goalTable] = await client`SELECT to_regclass('public.goals') AS name`;
	assert.equal(goalTable.name, "goals", "Preserved baseline upgrades to goals");
	const [currency] =
		await client`INSERT INTO currencies (name, iso_code, symbol) VALUES ('Migration currency', 'TST', 'T') RETURNING id`;
	const [savedGoal] =
		await client`INSERT INTO goals (users_id, name, target_amount, current_amount, currencies_id)
		VALUES (${user.id}, 'Migration savings', 100, 12.34, ${currency.id}) RETURNING id`;
	await runMigrations(client);
	const [savedProgress] = await client`SELECT current_amount FROM goals WHERE id = ${savedGoal.id}`;
	assert.equal(savedProgress.current_amount, "12.34", "Repeat migrations preserve goal progress");

	// The previous production schema had no budgets or week-start preference.
	await client`DROP TABLE goals`;
	await client`DROP TYPE goal_status`;
	await client`DROP SCHEMA drizzle CASCADE`;
	await client`DROP TABLE budget_alerts, budgets`;
	await client`ALTER TABLE users DROP COLUMN week_start_day`;
	await client`ALTER TABLE categories ALTER COLUMN created_at TYPE timestamp USING created_at AT TIME ZONE 'UTC'`;
	await client`ALTER TABLE categories ALTER COLUMN updated_at TYPE timestamp USING updated_at AT TIME ZONE 'UTC'`;
	await runMigrations(client);
	const [legacyUser] = await client`SELECT week_start_day FROM users WHERE id = ${user.id}`;
	assert.equal(legacyUser.week_start_day, 0);
	const [newTables] = await client`SELECT count(*)::int AS count FROM budgets`;
	assert.equal(newTables.count, 0);
	await runMigrations(client);

	// Incompatible existing enum values must roll back without baselining.
	await client`DROP TABLE goals`;
	await client`DROP TYPE goal_status`;
	await client`DROP SCHEMA drizzle CASCADE`;
	await client`ALTER TYPE budget_period ADD VALUE 'invalid'`;
	await client`DROP TABLE budget_alerts, budgets`;
	await assert.rejects(runMigrations(client), /differs from the supported baseline/);
	const [absentJournal] = await client`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
	assert.equal(absentJournal.name, null);
	await assertMigrationLockReleased(client);
	const [rolledBackTable] = await client`SELECT to_regclass('public.budgets') AS name`;
	assert.equal(rolledBackTable.name, null);

	// A failed schema push may have left only enum types behind.
	await client`DROP SCHEMA public CASCADE`;
	await client`CREATE SCHEMA public`;
	await client`CREATE TYPE categories_type AS ENUM ('system', 'user')`;
	await client`CREATE TYPE budget_alert_type AS ENUM ('threshold', 'exceeded')`;
	await runMigrations(client);
	await runMigrations(client);
	const [enumRecovery] = await client`SELECT count(*)::int AS count FROM budgets`;
	assert.equal(enumRecovery.count, 0);
	console.log(
		"Fresh and preserved database migrations pass, preserve data, and reject incompatible drift.",
	);
} finally {
	if (client) await client.end();
	await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
	await admin.end();
}
