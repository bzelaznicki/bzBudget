import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is required");
const admin = postgres(process.env.TEST_DATABASE_URL, { max: 1 });
const name = `migration_test_${randomUUID().replaceAll("-", "")}`;
let client;
try {
	await admin.unsafe(`CREATE DATABASE "${name}"`);
	const url = new URL(process.env.TEST_DATABASE_URL);
	url.pathname = `/${name}`;
	client = postgres(url.toString(), { max: 1 });
	const db = drizzle(client);
	await migrate(db, { migrationsFolder: "./drizzle" });
	await migrate(db, { migrationsFolder: "./drizzle" });
	const [history] = await client`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`;
	assert.equal(history.count, 1);
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
	console.log(
		"Migrations pass on a fresh database, repeat safely, and deduplicate alerts by UTC date.",
	);
} finally {
	if (client) await client.end();
	await admin.unsafe(`DROP DATABASE IF EXISTS "${name}"`);
	await admin.end();
}
