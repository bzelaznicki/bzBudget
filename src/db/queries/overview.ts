import { and, eq, gte, isNull, sql } from "drizzle-orm";

import { db } from "../db";
import { bankAccounts, categories, currencies, transactions, users } from "../schema";

export type MonthlyNetWorthPoint = {
	/** First day of the month, ISO `YYYY-MM-DD`. */
	month: string;
	/** Running balance at the end of that month. */
	balance: number;
};

export type NetWorthSeries = {
	points: MonthlyNetWorthPoint[];
	current: number;
	/** Change over the most recent month, absolute and as a share of the opening balance. */
	changeAbsolute: number;
	changePercent: number | null;
	currency: CurrencyDisplay;
};

export type CurrencyDisplay = {
	isoCode: string;
	symbol: string;
	position: "before" | "after";
};

export type CategorySpendSlice = {
	name: string;
	amount: number;
};

export type CategorySpendBreakdown = {
	slices: CategorySpendSlice[];
	total: number;
	currency: CurrencyDisplay;
};

export type AccountBalance = {
	id: string;
	name: string;
	iban: string | null;
	balance: number;
	/** Net movement across the current calendar month. */
	monthChange: number;
	currency: CurrencyDisplay;
};

const FALLBACK_CURRENCY: CurrencyDisplay = { isoCode: "EUR", symbol: "€", position: "before" };

/**
 * Picks the row denominated in `currency`, or null.
 *
 * Deliberately has no "first row" fallback: the per-currency summaries are only
 * comparable within one currency, so showing a GBP total under a EUR symbol would be
 * worse than showing nothing.
 */
export function pickCurrencyRow<T extends { currency: { isoCode: string } }>(
	rows: T[] | null | undefined,
	currency: CurrencyDisplay,
): T | null {
	return rows?.find((row) => row.currency.isoCode === currency.isoCode) ?? null;
}

/** Signed amount: incoming counts up, outgoing counts down. */
const SIGNED_AMOUNT = sql<string>`sum(
	case when ${transactions.type} = 'incoming' then ${transactions.amount} else -${transactions.amount} end
)`;

function toCurrencyDisplay(row: {
	isoCode: string | null;
	symbol: string | null;
	position: "before" | "after" | null;
}): CurrencyDisplay {
	if (!row.isoCode || !row.symbol) {
		return FALLBACK_CURRENCY;
	}

	return {
		isoCode: row.isoCode,
		symbol: row.symbol,
		position: row.position === "before" ? "before" : "after",
	};
}

/**
 * Resolves the currency the overview screens should be denominated in: the user's default,
 * or the currency they transact in most often when no default is set.
 *
 * bzBudget has no FX rates yet, so every overview figure is scoped to this single currency
 * rather than summed across all of them.
 */
export async function getPrimaryCurrency(userId: string): Promise<CurrencyDisplay> {
	const [preferred] = await db
		.select({
			isoCode: currencies.isoCode,
			symbol: currencies.symbol,
			position: currencies.position,
		})
		.from(users)
		.innerJoin(currencies, eq(users.defaultCurrenciesId, currencies.id))
		.where(eq(users.id, userId))
		.limit(1);

	if (preferred) {
		return toCurrencyDisplay(preferred);
	}

	const [mostUsed] = await db
		.select({
			isoCode: currencies.isoCode,
			symbol: currencies.symbol,
			position: currencies.position,
			uses: sql<string>`count(*)`,
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(and(eq(transactions.usersId, userId), isNull(transactions.deletedAt)))
		.groupBy(currencies.id)
		.orderBy(sql`count(*) desc`)
		.limit(1);

	return mostUsed ? toCurrencyDisplay(mostUsed) : FALLBACK_CURRENCY;
}

/**
 * Running balance at the end of each of the last `months` calendar months.
 *
 * The opening balance folds in every transaction booked before the window, so the first
 * point is a true running total rather than that month's net movement.
 */
export async function getNetWorthSeries(
	userId: string,
	months = 12,
	currency?: CurrencyDisplay,
): Promise<NetWorthSeries> {
	const resolvedCurrency = currency ?? (await getPrimaryCurrency(userId));
	const windowStart = sql`date_trunc('month', CURRENT_DATE) - make_interval(months => ${months - 1})`;

	const scope = and(
		eq(transactions.usersId, userId),
		isNull(transactions.deletedAt),
		eq(currencies.isoCode, resolvedCurrency.isoCode),
	);

	const [openingRow] = await db
		.select({ total: SIGNED_AMOUNT })
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(and(scope, sql`${transactions.bookedAt} < ${windowStart}`));

	const monthlyRows = await db
		.select({
			month: sql<string>`to_char(date_trunc('month', ${transactions.bookedAt}), 'YYYY-MM-DD')`,
			total: SIGNED_AMOUNT,
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(and(scope, gte(transactions.bookedAt, windowStart)))
		.groupBy(sql`date_trunc('month', ${transactions.bookedAt})`)
		.orderBy(sql`date_trunc('month', ${transactions.bookedAt})`);

	const movementByMonth = new Map(monthlyRows.map((row) => [row.month, Number(row.total ?? 0)]));

	// Walk every month in the window so gaps render as a flat line rather than disappearing.
	const now = new Date();
	const points: MonthlyNetWorthPoint[] = [];
	let balance = Number(openingRow?.total ?? 0);

	for (let offset = months - 1; offset >= 0; offset -= 1) {
		const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
		const key = cursor.toISOString().slice(0, 10);
		balance += movementByMonth.get(key) ?? 0;
		points.push({ month: key, balance });
	}

	const current = points.at(-1)?.balance ?? 0;
	const opening = points.at(-2)?.balance ?? 0;
	const changeAbsolute = current - opening;

	return {
		points,
		current,
		changeAbsolute,
		changePercent: opening === 0 ? null : (changeAbsolute / Math.abs(opening)) * 100,
		currency: resolvedCurrency,
	};
}

/**
 * "Where it went" — this month's outgoing spend by category, largest first.
 *
 * Anything past `topN` is folded into a single "Everything else" slice so the donut stays
 * readable, matching the Warm Ledger breakdown card.
 */
export async function getCategorySpendBreakdown(
	userId: string,
	topN = 4,
	currency?: CurrencyDisplay,
): Promise<CategorySpendBreakdown> {
	const resolvedCurrency = currency ?? (await getPrimaryCurrency(userId));

	const rows = await db
		.select({
			name: sql<string>`coalesce(${categories.name}, 'Uncategorised')`,
			total: sql<string>`sum(${transactions.amount})`,
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.leftJoin(categories, eq(transactions.categoriesId, categories.id))
		.where(
			and(
				eq(transactions.usersId, userId),
				isNull(transactions.deletedAt),
				eq(transactions.type, "outgoing"),
				eq(currencies.isoCode, resolvedCurrency.isoCode),
				gte(transactions.bookedAt, sql`date_trunc('month', CURRENT_DATE)`),
			),
		)
		.groupBy(sql`coalesce(${categories.name}, 'Uncategorised')`)
		.orderBy(sql`sum(${transactions.amount}) desc`);

	const all = rows.map((row) => ({ name: row.name, amount: Number(row.total ?? 0) }));
	const leading = all.slice(0, topN);
	const rest = all.slice(topN).reduce((sum, slice) => sum + slice.amount, 0);
	const slices = rest > 0 ? [...leading, { name: "Everything else", amount: rest }] : leading;

	return {
		slices,
		total: all.reduce((sum, slice) => sum + slice.amount, 0),
		currency: resolvedCurrency,
	};
}

/** Every active account with its running balance and net movement this month. */
export async function getAccountBalances(userId: string): Promise<AccountBalance[]> {
	const monthStart = sql`date_trunc('month', CURRENT_DATE)`;

	const rows = await db
		.select({
			id: bankAccounts.id,
			name: bankAccounts.name,
			iban: bankAccounts.iban,
			isoCode: currencies.isoCode,
			symbol: currencies.symbol,
			position: currencies.position,
			// Only transactions booked in the account's own currency count towards its
			// balance — a transaction may carry a different currency, and summing those
			// together would produce a figure that means nothing under either symbol.
			balance: sql<string>`coalesce((
				select sum(case when t.type = 'incoming' then t.amount else -t.amount end)
				from transactions t
				where t.accounts_id = ${bankAccounts.id}
					and t.deleted_at is null
					and t.currencies_id = ${bankAccounts.currenciesId}
			), 0)`,
			monthChange: sql<string>`coalesce((
				select sum(case when t.type = 'incoming' then t.amount else -t.amount end)
				from transactions t
				where t.accounts_id = ${bankAccounts.id}
					and t.deleted_at is null
					and t.currencies_id = ${bankAccounts.currenciesId}
					and t.booked_at >= ${monthStart}
			), 0)`,
		})
		.from(bankAccounts)
		.innerJoin(currencies, eq(bankAccounts.currenciesId, currencies.id))
		.where(and(eq(bankAccounts.usersId, userId), isNull(bankAccounts.deletedAt)))
		.orderBy(bankAccounts.name);

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		iban: row.iban,
		balance: Number(row.balance ?? 0),
		monthChange: Number(row.monthChange ?? 0),
		currency: toCurrencyDisplay(row),
	}));
}
