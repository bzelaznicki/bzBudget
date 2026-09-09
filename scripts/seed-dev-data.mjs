/**
 * Fills a local database with enough realistic activity to review the UI: three accounts
 * (one in a second currency), thirteen months of transactions, and budgets that land on
 * each of the on-track / threshold / exceeded states.
 *
 * Run `pnpm seed` first — this depends on the currencies and categories it inserts.
 *
 *   pnpm seed:dev                       # seeds dev@bzbudget.local
 *   SEED_EMAIL=you@example.com pnpm seed:dev
 *
 * The named user must already exist; sign up through the app first. This deletes that
 * user's accounts, transactions and budgets before reinserting, so it is re-runnable —
 * which is also why it refuses to touch a non-local database.
 */
import "dotenv/config";
import postgres from "postgres";

const EMAIL = process.env.SEED_EMAIL ?? "dev@bzbudget.local";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error("DATABASE_URL is required");

// This script destroys data. Refuse anything that is not plainly a local database unless
// the caller has said explicitly that they mean it.
const host = new URL(connectionString).hostname;
const isLocal = ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(host);

if (!isLocal && process.env.SEED_ALLOW_REMOTE !== "yes") {
	throw new Error(
		`Refusing to seed non-local host "${host}". This deletes the user's existing accounts, ` +
			`transactions and budgets. Set SEED_ALLOW_REMOTE=yes only if that is what you want.`,
	);
}

const sql = postgres(connectionString);

try {
	const [user] = await sql`select id from users where email = ${EMAIL}`;
	if (!user) {
		throw new Error(`No user with email ${EMAIL}. Sign up through the app first.`);
	}

	const currencyRows = await sql`
		select id, iso_code from currencies where iso_code in ('EUR', 'GBP')`;
	const currency = Object.fromEntries(currencyRows.map((row) => [row.iso_code, row.id]));

	if (!currency.EUR || !currency.GBP) {
		throw new Error("Missing EUR/GBP currencies — run `pnpm seed` first.");
	}

	const categoryRows = await sql`select id, name from categories`;
	const byName = new Map(categoryRows.map((row) => [row.name.toLowerCase(), row.id]));
	const category = (name) => byName.get(name) ?? null;

	const groceries = category("groceries");
	const dining = category("dining out");
	const transport = category("transport");
	const utilities = category("housing & utilities");
	const subscriptions = category("subscriptions & media");
	const household = category("home & supplies");
	const entertainment = category("entertainment");

	await sql`delete from transactions where users_id = ${user.id}`;
	await sql`delete from budgets where users_id = ${user.id}`;
	await sql`delete from bank_accounts where users_id = ${user.id}`;

	const accounts = {};
	for (const [name, iban, iso] of [
		["Main checking", "DE89 3704 0044 0532 0130 00", "EUR"],
		["Savings", "DE89 3704 0044 0532 0130 99", "EUR"],
		["Travel card", "GB29 NWBK 6016 1331 9268 19", "GBP"],
	]) {
		const [row] = await sql`
			insert into bank_accounts (users_id, name, iban, currencies_id)
			values (${user.id}, ${name}, ${iban}, ${currency[iso]})
			returning id`;
		accounts[name] = { id: row.id, currenciesId: currency[iso] };
	}

	const now = new Date();
	const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

	/**
	 * A date `monthsAgo` months back on the given day. Days in the current month are pulled
	 * back to today at the latest, so the fixture never contains future-dated activity.
	 */
	const at = (monthsAgo, day, hour = 12) => {
		const cappedDay = monthsAgo === 0 ? Math.min(day, now.getDate()) : day;
		return new Date(now.getFullYear(), now.getMonth() - monthsAgo, cappedDay, hour);
	};

	const rows = [];
	const add = (account, amount, counterparty, description, categoriesId, bookedAt, type) =>
		rows.push({
			users_id: user.id,
			accounts_id: accounts[account].id,
			currencies_id: accounts[account].currenciesId,
			amount: amount.toFixed(2),
			counterparty,
			description,
			categories_id: categoriesId,
			booked_at: bookedAt,
			type,
		});

	// Opening balances, so net worth starts somewhere sensible rather than at zero.
	add("Main checking", 4200, "Opening balance", "Carried over", null, at(13, 1), "incoming");
	add("Savings", 34500, "Opening balance", "Carried over", null, at(13, 1), "incoming");
	add("Travel card", 3100, "Opening balance", "Carried over", null, at(13, 1), "incoming");

	for (let m = 12; m >= 0; m--) {
		// Salary drifts upward so the net-worth line has some shape to it.
		const salary = 4600 + (12 - m) * 18;
		add("Main checking", salary, "Contoso GmbH", "Monthly salary", null, at(m, 3, 9), "incoming");
		add("Main checking", 1180, "Hausverwaltung", "Rent", utilities, at(m, 1, 8), "outgoing");
		add("Main checking", 96, "Vattenfall", "Electricity", utilities, at(m, 12, 10), "outgoing");
		add("Main checking", 39.99, "Telekom", "Broadband", utilities, at(m, 15, 10), "outgoing");
		add("Main checking", 8.99, "Spotify", "Premium Duo", subscriptions, at(m, 7, 6), "outgoing");
		add("Main checking", 13.99, "Netflix", "Standard", subscriptions, at(m, 2, 6), "outgoing");
		add("Main checking", 400, "Savings transfer", "Standing order", null, at(m, 4, 7), "outgoing");
		add("Savings", 400, "Savings transfer", "Standing order", null, at(m, 4, 7), "incoming");

		for (const [day, amount, merchant] of [
			[2, 58.4, "Rewe"],
			[9, 62.4, "Rewe"],
			[16, 47.8, "Edeka"],
			[23, 51.2, "Rewe"],
		]) {
			add(
				"Main checking",
				amount + (m % 3) * 3,
				merchant,
				"Weekly shop",
				groceries,
				at(m, day, 18),
				"outgoing",
			);
		}

		add("Main checking", 47.2, "Trattoria Sole", "Dinner", dining, at(m, 7, 19), "outgoing");
		add("Main checking", 32.5, "Café Kranzler", "Brunch", dining, at(m, 21, 11), "outgoing");
		add("Main checking", 49, "Deutsche Bahn", "Monthly ticket", transport, at(m, 8, 8), "outgoing");
		add("Main checking", 24.19, "dm drogerie", null, household, at(m, 18, 17), "outgoing");
		// Foreign-currency spend, so the multi-currency paths get exercised.
		add(
			"Travel card",
			42 + (m % 4) * 9,
			"Pret A Manger",
			"Lunch",
			dining,
			at(m, 11, 13),
			"outgoing",
		);
	}

	// A few entries in the last day or so, so the ledger has a populated "Today" group
	// containing more than one currency.
	const hoursAgo = (h) => new Date(now.getTime() - h * 3600 * 1000);
	add("Main checking", 62.4, "Rewe", "Weekly shop", groceries, hoursAgo(3), "outgoing");
	add("Main checking", 2.99, "iCloud", "200 GB storage", subscriptions, hoursAgo(6), "outgoing");
	add("Travel card", 49, "Trainline", "Return to Manchester", transport, hoursAgo(20), "outgoing");
	add("Main checking", 88.4, "IKEA", "Shelving", household, hoursAgo(30), "outgoing");

	for (const row of rows) {
		await sql`insert into transactions ${sql(
			row,
			"users_id",
			"accounts_id",
			"currencies_id",
			"amount",
			"counterparty",
			"description",
			"categories_id",
			"booked_at",
			"type",
		)}`;
	}

	// Limits are derived from this month's real spend, so every budget state is on screen
	// regardless of which day of the month the script runs.
	const spentThisMonth = new Map();
	for (const row of rows) {
		if (row.type !== "outgoing" || !row.categories_id) continue;
		if (row.booked_at < monthStart) continue;
		const running = spentThisMonth.get(row.categories_id) ?? 0;
		spentThisMonth.set(row.categories_id, running + Number(row.amount));
	}

	const roundTo5 = (value) => Math.max(Math.round(value / 5) * 5, 5);
	let budgetCount = 0;

	for (const [categoriesId, utilisation] of [
		[groceries, 0.42],
		[dining, 0.55],
		[transport, 1.15],
		[subscriptions, 0.86],
		[household, 0.35],
		[utilities, 0.92],
		[entertainment, 0.6],
	]) {
		const spent = spentThisMonth.get(categoriesId);
		if (!categoriesId || !spent) continue;

		await sql`
			insert into budgets (users_id, categories_id, amount, period, alert_threshold, email_alerts)
			values (${user.id}, ${categoriesId}, ${roundTo5(spent / utilisation)}, 'monthly', 80, false)`;
		budgetCount += 1;
	}

	console.log(
		`Seeded ${rows.length} transactions, ${Object.keys(accounts).length} accounts and ` +
			`${budgetCount} budgets for ${EMAIL}.`,
	);
} finally {
	await sql.end();
}
