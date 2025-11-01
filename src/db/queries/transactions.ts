import { and, asc, desc, eq, gte, lte, count } from "drizzle-orm";
import { db } from "../db";
import { transactions, currencies, categories } from "../schema";

export interface TransactionResponse {
	id: string;
	usersId: string;
	accountsId: string;
	amount: string;
	description: string | null;
	counterparty: string;
	currenciesId: string | null;
	currency: {
		isoCode: string;
		symbol: string;
		position: "before" | "after";
	};
	categoriesId: string | null;
	category: {
		id: string;
		name: string;
		type: "system" | "user";
	} | null;
	externalId: string | null;
	bookedAt: Date;
	type: string;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export interface GetTransactionsArgs {
	usersId: string;
	dateFrom?: Date;
	dateTo?: Date;
	limit?: number | null;
	offset?: number | null;
	sortField?: "bookedAt" | "amount" | "counterparty" | "type" | "createdAt" | "updatedAt";
	dir?: "asc" | "desc" | null;
}

export type CountTransactionsArgs = Pick<GetTransactionsArgs, "usersId" | "dateFrom" | "dateTo">;

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
	const insertedTransactions = await db
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
		.returning({
			id: transactions.id,
			usersId: transactions.usersId,
			accountsId: transactions.accountsId,
			amount: transactions.amount,
			description: transactions.description,
			counterparty: transactions.counterparty,
			currenciesId: transactions.currenciesId,
			categoriesId: transactions.categoriesId,
			externalId: transactions.externalId,
			bookedAt: transactions.bookedAt,
			type: transactions.type,
			createdAt: transactions.createdAt,
			updatedAt: transactions.updatedAt,
		});

	if (insertedTransactions.length === 0) {
		return null;
	}

	const transaction = insertedTransactions[0];

	if (transaction.currenciesId == null) {
		return null;
	}

	const [currencyResult, categoryResult] = await Promise.all([
		db
			.select({
				isoCode: currencies.isoCode,
				symbol: currencies.symbol,
				position: currencies.position,
			})
			.from(currencies)
			.where(eq(currencies.id, transaction.currenciesId))
			.limit(1),
		transaction.categoriesId
			? db
				.select({
					id: categories.id,
					name: categories.name,
					type: categories.type,
				})
				.from(categories)
				.where(eq(categories.id, transaction.categoriesId))
				.limit(1)
			: Promise.resolve([]),
	]);

	if (currencyResult.length === 0) {
		return null;
	}

	const currency = currencyResult[0];
	const category =
		categoryResult.length > 0
			? {
				id: categoryResult[0].id,
				name: categoryResult[0].name,
				type: categoryResult[0].type,
			}
			: null;

	return {
		id: transaction.id,
		usersId: transaction.usersId,
		accountsId: transaction.accountsId,
		amount: transaction.amount,
		description: transaction.description,
		counterparty: transaction.counterparty,
		currenciesId: transaction.currenciesId,
		currency: {
			isoCode: currency.isoCode,
			symbol: currency.symbol,
			position: currency.position === "before" ? "before" : "after",
		},
		categoriesId: transaction.categoriesId,
		category,
		externalId: transaction.externalId,
		bookedAt: transaction.bookedAt,
		type: transaction.type,
		createdAt: transaction.createdAt,
		updatedAt: transaction.updatedAt,
	};
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
			orderField = dir === "asc" ? asc(transactions.bookedAt) : desc(transactions.bookedAt);
			break;
		case "amount":
			orderField = dir === "asc" ? asc(transactions.amount) : desc(transactions.amount);
			break;
		case "counterparty":
			orderField = dir === "asc" ? asc(transactions.counterparty) : desc(transactions.counterparty);
			break;
		case "type":
			orderField = dir === "asc" ? asc(transactions.type) : desc(transactions.type);
			break;
		case "createdAt":
			orderField = dir === "asc" ? asc(transactions.createdAt) : desc(transactions.createdAt);
			break;
		case "updatedAt":
			orderField = dir === "asc" ? asc(transactions.updatedAt) : desc(transactions.updatedAt);
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
		.select({
			id: transactions.id,
			usersId: transactions.usersId,
			accountsId: transactions.accountsId,
			amount: transactions.amount,
			description: transactions.description,
			counterparty: transactions.counterparty,
			currenciesId: transactions.currenciesId,
			categoriesId: transactions.categoriesId,
			externalId: transactions.externalId,
			bookedAt: transactions.bookedAt,
			type: transactions.type,
			createdAt: transactions.createdAt,
			updatedAt: transactions.updatedAt,
			currencyIsoCode: currencies.isoCode,
			currencySymbol: currencies.symbol,
			currencyPosition: currencies.position,
			categoryId: categories.id,
			categoryName: categories.name,
			categoryType: categories.type,
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.leftJoin(categories, eq(transactions.categoriesId, categories.id))
		.where(whereClause)
		.orderBy(orderField)
		.limit(limit)
		.offset(offset);

	return userTransactions.length > 0
		? userTransactions.map((transaction) => ({
			id: transaction.id,
			usersId: transaction.usersId,
			accountsId: transaction.accountsId,
			amount: transaction.amount,
			description: transaction.description,
			counterparty: transaction.counterparty,
			currenciesId: transaction.currenciesId,
			currency: {
				isoCode: transaction.currencyIsoCode,
				symbol: transaction.currencySymbol,
				position: transaction.currencyPosition === "before" ? "before" : "after",
			},
			categoriesId: transaction.categoriesId,
			category: transaction.categoryId
				? {
					id: transaction.categoryId,
					name: transaction.categoryName ?? "Uncategorized",
					type: transaction.categoryType ?? "system",
				}
				: null,
			externalId: transaction.externalId,
			bookedAt: transaction.bookedAt,
			type: transaction.type,
			createdAt: transaction.createdAt,
			updatedAt: transaction.updatedAt,
		}))
		: null;
}

export async function countUserTransactions(args: CountTransactionsArgs): Promise<number> {
	const filters = [eq(transactions.usersId, args.usersId)];
	if (args.dateFrom) {
		filters.push(gte(transactions.bookedAt, args.dateFrom));
	}
	if (args.dateTo) {
		filters.push(lte(transactions.bookedAt, args.dateTo));
	}

	const whereClause = filters.length === 1 ? filters[0] : and(...filters);
	const result = await db
		.select({
			total: count(),
		})
		.from(transactions)
		.where(whereClause);

	return Number(result[0]?.total ?? 0);
}

export async function deleteUserTransaction(userId: string, transactionId: string) {
	const timestamp = new Date();
	const res = await db.update(transactions).set({ updatedAt: timestamp, deletedAt: timestamp }).where(and(eq(transactions.usersId, userId), (eq(transactions.id, transactionId)))).returning();

	return res[0] ?? null;
}
