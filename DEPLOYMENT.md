# Railway deployment

Production deploys `main` to the bzBudget service. PR environments use their own PostgreSQL database.

The Railway service settings are:

- Pre-deploy command: `pnpm migrate`
- Start command: `pnpm start`
- Health check: `/api/health`, timeout 120 seconds

The health endpoint returns 200 only when PostgreSQL is reachable and the required budget tables and user column exist. Failed migrations or health checks must prevent a new release from receiving traffic.

Use `pnpm drizzle-kit generate` for schema changes and commit the generated migration and metadata. Do not use `drizzle-kit push` during deployment. For a fresh database, run `pnpm migrate`, then `pnpm seed` to populate currencies and categories.

Run `TEST_DATABASE_URL=postgresql://... node scripts/test-migrations.mjs` against a disposable PostgreSQL server. The test creates and removes its own database. CI runs it alongside lint and the production build.

## Existing production database

On 2026-09-08, production had the pre-budget schema created through schema push, with an empty migration ledger. After backing it up and testing the upgrade on a restored copy, the missing budget objects and user column were added, category timestamps were converted from UTC to timestamptz, and migration 0000 was recorded in the ledger. The resulting columns, constraints, and indexes matched a fresh migration exactly. Later deployments can run normal migrations.

The original migration had never completed successfully. Its alert index now uses an explicit UTC date because PostgreSQL rejects timezone-dependent index expressions.
