import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../db";
import { transactions } from "../schema";

export interface TransactionResponse {
	id: string;
	usersId: string;
	accountsId: string;
	amount: string;
	description: string | null;
	counterparty: string;
	currenciesId: string | null;
	categoriesId: string | null;
	externalId: string | null;
	bookedAt: Date;
	type: string;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export interface GetTransactionsArgs {
	usersId: string;
	dateFrom: Date | null;
	dateTo: Date | null;
	limit: number | null;
	offset: number | null;
	sortField: "bookedAt" | "amount" | "counterparty" | "type" | "createdAt" | "updatedAt" | null;
	dir: "asc" | "desc" | null;
}

export async function createTransaction(
	userId: string,
	accountsId: string,
	amount: number,
	counterparty: string,
	currenciesId: string,
	bookedAt: Date,
	type: "incoming" | "outgoing",
	description?: string,
	categoriesId?: string,
	externalId?: string,
): Promise<TransactionResponse | null> {
	const transaction = await db
		.insert(transactions)
		.values({
			usersId: userId,
			accountsId,
			amount: amount.toString(),
			counterparty,
			currenciesId,
			bookedAt,
			type,
			description,
			categoriesId,
			externalId,
		})
		.returning();

	return transaction.length > 0 ? transaction[0] : null;
}

export async function getUserTransactions(
	args: GetTransactionsArgs,
): Promise<TransactionResponse[] | null> {
	const limit = args.limit ?? 10;
	const offset = args.offset ?? 0;
	const dir = args.dir === "asc" ? "asc" : "desc";

	let orderField = desc(transactions.bookedAt);
	switch (args.sortField) {
		case "bookedAt":
			orderField =
				dir === "asc" ? asc(transactions.bookedAt) : desc(transactions.bookedAt);
			break;
		case "amount":
			orderField = dir === "asc" ? asc(transactions.amount) : desc(transactions.amount);
			break;
		case "counterparty":
			orderField =
				dir === "asc"
					? asc(transactions.counterparty)
					: desc(transactions.counterparty);
			break;
		case "type":
			orderField = dir === "asc" ? asc(transactions.type) : desc(transactions.type);
			break;
		case "createdAt":
			orderField =
				dir === "asc" ? asc(transactions.createdAt) : desc(transactions.createdAt);
			break;
		case "updatedAt":
			orderField =
				dir === "asc" ? asc(transactions.updatedAt) : desc(transactions.updatedAt);
			break;
		default:
			orderField = desc(transactions.bookedAt);
	}

	const filters = [eq(transactions.usersId, args.usersId)];
	if (args.dateFrom) {
		filters.push(gte(transactions.bookedAt, args.dateFrom));
	}
	if (args.dateTo) {
		filters.push(lte(transactions.bookedAt, args.dateTo));
	}

	const whereClause = filters.length === 1 ? filters[0] : and(...filters);

	const userTransactions = await db
		.select()
		.from(transactions)
		.where(whereClause)
		.orderBy(orderField)
		.limit(limit)
		.offset(offset);

	return userTransactions.length > 0 ? userTransactions : null;
}
