import "dotenv/config";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Compare actual database objects, not just the existence of a journal entry.
async function describeSchema(tx, schema) {
	const columns = await tx`
		SELECT c.relname AS table_name, a.attname AS name,
			format_type(a.atttypid, a.atttypmod) AS type, a.attnotnull AS not_null,
			pg_get_expr(d.adbin, d.adrelid) AS default_value
		FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
		WHERE n.nspname = ${schema} AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY c.relname, a.attname`;
	const constraints = await tx`
		SELECT c.relname AS table_name, con.conname AS name, pg_get_constraintdef(con.oid) AS definition
		FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = ${schema} ORDER BY c.relname, con.conname`;
	const indexes = await tx`SELECT tablename AS table_name, indexname AS name, indexdef AS definition
		FROM pg_indexes WHERE schemaname = ${schema} ORDER BY tablename, indexname`;
	const enums =
		await tx`SELECT t.typname AS name, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
		FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_enum e ON e.enumtypid = t.oid
		WHERE n.nspname = ${schema} GROUP BY t.typname ORDER BY t.typname`;
	return JSON.parse(
		JSON.stringify({ columns, constraints, indexes, enums })
			.replaceAll(`\\"${schema}\\".`, "")
			.replaceAll(`${schema}.`, ""),
	);
}

export async function runMigrations(client) {
	const session = await client.reserve();
	// postgres.js reserved connections omit the transaction helpers and options
	// that Drizzle needs. Keep these operations on the reserved connection too.
	session.options = client.options;
	session.begin = async (work) => {
		await session`BEGIN`;
		try {
			const result = await work(session);
			await session`COMMIT`;
			return result;
		} catch (error) {
			await session`ROLLBACK`;
			throw error;
		}
	};
	session.savepoint = async (work) => {
		await session`SAVEPOINT migration_step`;
		try {
			return await work(session);
		} catch (error) {
			await session`ROLLBACK TO SAVEPOINT migration_step`;
			throw error;
		} finally {
			await session`RELEASE SAVEPOINT migration_step`;
		}
	};
	try {
		await session`SELECT pg_advisory_lock(182734091)`;
		try {
			await applyMigrations(session);
		} finally {
			await session`SELECT pg_advisory_unlock(182734091)`;
		}
	} finally {
		session.release();
	}
}

async function applyMigrations(client) {
	const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
	const baseline = migrations[0];
	await client.begin(async (tx) => {
		const [journal] = await tx`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
		if (journal.name) {
			const history = await tx`SELECT id FROM drizzle.__drizzle_migrations LIMIT 1`;
			if (history.length) return;
		}
		const [existing] = await tx`SELECT EXISTS (
			SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = 'public' AND c.relkind = 'r'
			UNION ALL SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = 'public' AND t.typtype = 'e'
		) AS found`;
		if (!existing.found) return;

		// Build the reference in an isolated schema within this same transaction.
		const reference = `baseline_${randomUUID().replaceAll("-", "")}`;
		await tx.unsafe(`CREATE SCHEMA "${reference}"`);
		await tx.unsafe(`SET LOCAL search_path TO "${reference}"`);
		for (const statement of baseline.sql) {
			await tx.unsafe(statement.replaceAll('"public".', `"${reference}".`));
		}
		await tx`SET LOCAL search_path TO public`;
		const expected = await describeSchema(tx, reference);

		// Replay only missing baseline objects. Existing objects must match below.
		for (const statement of baseline.sql) {
			await tx
				.savepoint(async (sp) => {
					await sp.unsafe(statement);
				})
				.catch((error) => {
					const duplicateObject = error.code === "42710" || error.code === "42P07";
					if (!duplicateObject) throw error;
				});
		}
		await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS week_start_day integer NOT NULL DEFAULT 0`;
		await tx
			.savepoint(async (sp) => {
				await sp`ALTER TABLE users ADD CONSTRAINT users_week_start_day_check CHECK (week_start_day BETWEEN 0 AND 6)`;
			})
			.catch((error) => {
				if (error.code !== "42710") throw error;
			});
		for (const column of ["created_at", "updated_at"]) {
			const [info] = await tx`SELECT data_type FROM information_schema.columns
				WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = ${column}`;
			if (info?.data_type === "timestamp without time zone") {
				await tx.unsafe(
					`ALTER TABLE categories ALTER COLUMN ${column} TYPE timestamptz USING ${column} AT TIME ZONE 'UTC'`,
				);
			}
		}
		const actual = await describeSchema(tx, "public");
		if (!isDeepStrictEqual(actual, expected)) {
			throw new Error(
				"Preserved database differs from the supported baseline; no changes were committed. Review its schema before migrating.",
			);
		}
		await tx`CREATE SCHEMA IF NOT EXISTS drizzle`;
		await tx`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
		await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${baseline.hash}, ${baseline.folderMillis})`;
		await tx.unsafe(`DROP SCHEMA "${reference}" CASCADE`);
	});
	await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
	const client = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
	try {
		await runMigrations(client);
		console.log("Migrations applied successfully.");
	} finally {
		await client.end();
	}
}
