# Transaction search and filters

The transaction ledger searches the full history before pagination. Search matches
merchant names, notes, category names, and decimal amounts without regard to case.
Percent signs, underscores, and backslashes are literal search characters.

Category, account, and date filters combine with search. Dates include the entire
selected UTC days. Changing a filter resets pagination. The URL stores the search,
filters, and page so refreshing or sharing the URL restores the view for the signed-in
user. Clear filters resets the ledger. Search requests wait 250 ms after input changes;
obsolete requests are cancelled.

`GET /api/transactions` accepts `search` (up to 200 characters), `categoryId` and
`accountId` (UUIDs), `dateFrom` and `dateTo` (`YYYY-MM-DD`), `page` (1–1,000,000),
and `perPage` (1–100, default 20). Invalid parameters or reversed date ranges return 400. Authentication is required. Unknown or foreign account/category IDs return no
matches. Soft-deleted transactions are excluded. Results and counts use the same
filters, with transaction IDs breaking ties between identical booking timestamps.

Run `node scripts/test-transactions-api.mjs` after `pnpm build`, with
`TEST_DATABASE_URL` pointing to a PostgreSQL server where the test user can create
disposable databases. The suite creates and removes its own database and runs in CI.
