import { db } from "../db";
import { transactions, currencies } from "../schema";
import { sql, and, gte, lt, eq, sum } from "drizzle-orm";

export type DashboardResponse = {

	current: number;
	previous: number;

	currency: {
		isoCode: string;
		symbol: string;
		position: "before" | "after" | null
	}

}

export async function dashboardIncomeSummary(userId: string): Promise<DashboardResponse[] | null> {
	const startOfPreviousMonth = sql`date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'`;
	const startOfCurrentMonth = sql`date_trunc('month', CURRENT_DATE)`;
	const startOfNextMonth = sql`date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`;

	const currentRows = await db
		.select({
			symbol: currencies.symbol,
			isoCode: currencies.isoCode,
			position: currencies.position,
			total: sum(transactions.amount)
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(
			and(
				gte(transactions.bookedAt, startOfCurrentMonth),
				lt(transactions.bookedAt, startOfNextMonth),
				eq(transactions.usersId, userId),
				eq(transactions.type, "incoming")
			)
		).groupBy(currencies.id);

	const previousRows = await db
		.select({
			symbol: currencies.symbol,
			isoCode: currencies.isoCode,
			position: currencies.position,
			total: sum(transactions.amount)
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(
			and(
				gte(transactions.bookedAt, startOfPreviousMonth),
				lt(transactions.bookedAt, startOfCurrentMonth),
				eq(transactions.usersId, userId),
				eq(transactions.type, "incoming")
			)
		).groupBy(currencies.id);

	const currencyTotals = new Map<string, DashboardResponse>();

	for (const row of currentRows) {
		const current = Number(row.total ?? 0);
		currencyTotals.set(row.isoCode, {
			current,
			previous: 0,
			currency: {
				isoCode: row.isoCode,
				symbol: row.symbol,
				position: row.position,
			},
		});
	}

	for (const row of previousRows) {
		const previous = Number(row.total ?? 0);
		const existing = currencyTotals.get(row.isoCode);

		if (existing) {
			existing.previous = previous;
		} else {
			currencyTotals.set(row.isoCode, {
				current: 0,
				previous,
				currency: {
					isoCode: row.isoCode,
					symbol: row.symbol,
					position: row.position,
				},
			});
		}
	}

	return Array.from(currencyTotals.values()) ?? null;
}

export async function dashboardExpensesSummary(userId: string): Promise<DashboardResponse[] | null> {
	const startOfPreviousMonth = sql`date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'`;
	const startOfCurrentMonth = sql`date_trunc('month', CURRENT_DATE)`;
	const startOfNextMonth = sql`date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`;

	const currentRows = await db
		.select({
			symbol: currencies.symbol,
			isoCode: currencies.isoCode,
			position: currencies.position,
			total: sum(transactions.amount)
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(
			and(
				gte(transactions.bookedAt, startOfCurrentMonth),
				lt(transactions.bookedAt, startOfNextMonth),
				eq(transactions.usersId, userId),
				eq(transactions.type, "outgoing")
			)
		).groupBy(currencies.id);

	const previousRows = await db
		.select({
			symbol: currencies.symbol,
			isoCode: currencies.isoCode,
			position: currencies.position,
			total: sum(transactions.amount)
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.where(
			and(
				gte(transactions.bookedAt, startOfPreviousMonth),
				lt(transactions.bookedAt, startOfCurrentMonth),
				eq(transactions.usersId, userId),
				eq(transactions.type, "outgoing")
			)
		).groupBy(currencies.id);

	const currencyTotals = new Map<string, DashboardResponse>();

	for (const row of currentRows) {
		const current = Number(row.total ?? 0);
		currencyTotals.set(row.isoCode, {
			current,
			previous: 0,
			currency: {
				isoCode: row.isoCode,
				symbol: row.symbol,
				position: row.position,
			},
		});
	}

	for (const row of previousRows) {
		const previous = Number(row.total ?? 0);
		const existing = currencyTotals.get(row.isoCode);

		if (existing) {
			existing.previous = previous;
		} else {
			currencyTotals.set(row.isoCode, {
				current: 0,
				previous,
				currency: {
					isoCode: row.isoCode,
					symbol: row.symbol,
					position: row.position,
				},
			});
		}
	}

	return Array.from(currencyTotals.values()) ?? null;
}

export type DashboardSummary = {
	income: {
		current: number;
		previous: number;
	};
	expenses: {
		current: number;
		previous: number;
	};
	net: {
		current: number;
		previous: number;
	};
	transactions: {
		current: number;
		previous: number;
	};
	accounts: {
		total: number;
		newThisMonth: number;
	};
	currency: {
		isoCode: string;
		symbol: string;
		position: "before" | "after";
	};
};


const fallbackSummary: DashboardSummary = {
	income: { current: 12450.32, previous: 11210.45 },
	expenses: { current: 8250.76, previous: 7933.18 },
	net: { current: 4200.56, previous: 3277.27 },
	transactions: { current: 182, previous: 165 },
	accounts: { total: 6, newThisMonth: 2 },
	currency: { isoCode: "USD", symbol: "$", position: "before" },
};

export async function getDashboardSummary(
	_userId: string,
): Promise<DashboardSummary> {
	// Simulate the shape of a future asynchronous call while real data hooks
	// are being implemented.
	await new Promise((resolve) => setTimeout(resolve, 25));
	return fallbackSummary;
}
