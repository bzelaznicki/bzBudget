import {
	and,
	ilike,
	or,
	lt,
	asc,
	desc,
	eq,
	gte,
	lte,
	count,
	isNotNull,
	isNull,
	sql,
	sum,
} from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { transactions, currencies, categories, bankAccounts } from "../schema";

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
	recurring: boolean;
	/** Set on both legs of a move between the user's own accounts. */
	transferId: string | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export interface GetTransactionsArgs {
	usersId: string;
	search?: string;
	categoryId?: string;
	accountId?: string;
	dateBefore?: Date;
	dateFrom?: Date;
	dateTo?: Date;
	limit?: number | null;
	offset?: number | null;
	status?: "active" | "deleted" | "all";
	deletedFrom?: Date;
	deletedTo?: Date;
	sortField?: "bookedAt" | "amount" | "counterparty" | "type" | "createdAt" | "updatedAt";
	dir?: "asc" | "desc" | null;
}

export type CountTransactionsArgs = Pick<
	GetTransactionsArgs,
	"usersId" | "dateFrom" | "dateTo" | "dateBefore" | "search" | "categoryId" | "accountId"
>;

const TRANSACTION_COLUMNS = {
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
	recurring: transactions.recurring,
	transferId: transactions.transferId,
	createdAt: transactions.createdAt,
	updatedAt: transactions.updatedAt,
	currencyIsoCode: currencies.isoCode,
	currencySymbol: currencies.symbol,
	currencyPosition: currencies.position,
	categoryId: categories.id,
	categoryName: categories.name,
	categoryType: categories.type,
};

function selectTransactions() {
	return db
		.select(TRANSACTION_COLUMNS)
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.leftJoin(categories, eq(transactions.categoriesId, categories.id));
}

type TransactionRow = Awaited<ReturnType<typeof selectTransactions>>[number];

function toTransactionResponse(row: TransactionRow): TransactionResponse {
	return {
		id: row.id,
		usersId: row.usersId,
		accountsId: row.accountsId,
		amount: row.amount,
		description: row.description,
		counterparty: row.counterparty,
		currenciesId: row.currenciesId,
		currency: {
			isoCode: row.currencyIsoCode,
			symbol: row.currencySymbol,
			position: row.currencyPosition === "before" ? "before" : "after",
		},
		categoriesId: row.categoriesId,
		category: row.categoryId
			? {
					id: row.categoryId,
					name: row.categoryName ?? "Uncategorized",
					type: row.categoryType ?? "system",
				}
			: null,
		externalId: row.externalId,
		bookedAt: row.bookedAt,
		type: row.type,
		recurring: row.recurring,
		transferId: row.transferId,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

/** One live transaction the user owns, in the same shape the list endpoint returns. */
export async function getUserTransaction(
	usersId: string,
	transactionId: string,
): Promise<TransactionResponse | null> {
	const [row] = await selectTransactions()
		.where(
			and(
				eq(transactions.usersId, usersId),
				eq(transactions.id, transactionId),
				isNull(transactions.deletedAt),
			),
		)
		.limit(1);

	return row ? toTransactionResponse(row) : null;
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
	recurring = false,
): Promise<TransactionResponse | null> {
	const [inserted] = await db
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
			recurring,
		})
		.returning({ id: transactions.id });

	return inserted ? getUserTransaction(userId, inserted.id) : null;
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

	const filters = transactionFilters(args);
	if (!args.status || args.status === "active") {
		filters.push(isNull(transactions.deletedAt));
	}
	if (args.status === "deleted") {
		filters.push(isNotNull(transactions.deletedAt));
	}
	if (args.deletedFrom) {
		filters.push(gte(transactions.deletedAt, args.deletedFrom));
	}
	if (args.deletedTo) {
		filters.push(lte(transactions.deletedAt, args.deletedTo));
	}

	const whereClause = filters.length === 1 ? filters[0] : and(...filters);

	const userTransactions = await selectTransactions()
		.where(whereClause)
		.orderBy(orderField, desc(transactions.id))
		.limit(limit)
		.offset(offset);

	return userTransactions.length > 0 ? userTransactions.map(toTransactionResponse) : null;
}

function transactionFilters(args: CountTransactionsArgs) {
	const filters = [eq(transactions.usersId, args.usersId)];
	if (args.dateFrom) filters.push(gte(transactions.bookedAt, args.dateFrom));
	if (args.dateTo) filters.push(lte(transactions.bookedAt, args.dateTo));
	if (args.dateBefore) filters.push(lt(transactions.bookedAt, args.dateBefore));
	if (args.accountId) filters.push(eq(transactions.accountsId, args.accountId));
	if (args.categoryId) filters.push(eq(transactions.categoriesId, args.categoryId));
	if (args.search) {
		const pattern = `%${args.search.replace(/[\\%_]/g, "\\$&")}%`;
		filters.push(
			or(
				ilike(transactions.counterparty, pattern),
				ilike(transactions.description, pattern),
				ilike(sql`${transactions.amount}::text`, pattern),
				ilike(categories.name, pattern),
			)!,
		);
	}
	return filters;
}

export async function countUserTransactions(args: CountTransactionsArgs): Promise<number> {
	const filters = [...transactionFilters(args), isNull(transactions.deletedAt)];

	const whereClause = filters.length === 1 ? filters[0] : and(...filters);
	const result = await db
		.select({
			total: count(),
		})
		.from(transactions)
		.innerJoin(currencies, eq(transactions.currenciesId, currencies.id))
		.leftJoin(categories, eq(transactions.categoriesId, categories.id))
		.where(whereClause);

	return Number(result[0]?.total ?? 0);
}

export class TransactionUpdateError extends Error {}

/**
 * Applies detail-sheet edits. For a transfer leg the date and note apply to both legs, so the
 * pair never disagrees; a category makes no sense on a move and is rejected.
 */
export async function updateUserTransaction(
	usersId: string,
	transactionId: string,
	update: {
		counterparty?: string;
		categoriesId?: string | null;
		description?: string | null;
		bookedAt?: Date;
		recurring?: boolean;
	},
): Promise<TransactionResponse | null> {
	const existing = await getUserTransaction(usersId, transactionId);
	if (!existing) return null;

	if (existing.transferId && update.categoriesId) {
		throw new TransactionUpdateError("Transfers between your accounts don't take a category");
	}

	if (update.categoriesId) {
		const [category] = await db
			.select({ id: categories.id })
			.from(categories)
			.where(
				and(
					eq(categories.id, update.categoriesId),
					or(isNull(categories.usersId), eq(categories.usersId, usersId)),
				),
			)
			.limit(1);
		if (!category) throw new TransactionUpdateError("Invalid category");
	}

	const timestamp = new Date();
	const description = update.description === "" ? null : update.description;

	await db.transaction(async (tx) => {
		await tx
			.update(transactions)
			.set({
				updatedAt: timestamp,
				...(update.counterparty !== undefined ? { counterparty: update.counterparty } : {}),
				...(update.categoriesId !== undefined ? { categoriesId: update.categoriesId } : {}),
				...(update.recurring !== undefined ? { recurring: update.recurring } : {}),
			})
			.where(and(eq(transactions.usersId, usersId), eq(transactions.id, transactionId)));

		if (description !== undefined || update.bookedAt !== undefined) {
			const shared = {
				updatedAt: timestamp,
				...(description !== undefined ? { description } : {}),
				...(update.bookedAt !== undefined ? { bookedAt: update.bookedAt } : {}),
			};
			await tx
				.update(transactions)
				.set(shared)
				.where(
					and(
						eq(transactions.usersId, usersId),
						existing.transferId
							? eq(transactions.transferId, existing.transferId)
							: eq(transactions.id, transactionId),
						isNull(transactions.deletedAt),
					),
				);
		}
	});

	return getUserTransaction(usersId, transactionId);
}

/** Soft-deletes a transaction. Deleting either leg of a transfer removes the pair. */
export async function deleteUserTransaction(userId: string, transactionId: string) {
	const timestamp = new Date();
	return db.transaction(async (tx) => {
		const [res] = await tx
			.update(transactions)
			.set({ updatedAt: timestamp, deletedAt: timestamp })
			.where(
				and(
					eq(transactions.usersId, userId),
					eq(transactions.id, transactionId),
					isNull(transactions.deletedAt),
				),
			)
			.returning();

		if (res?.transferId) {
			await tx
				.update(transactions)
				.set({ updatedAt: timestamp, deletedAt: timestamp })
				.where(
					and(
						eq(transactions.usersId, userId),
						eq(transactions.transferId, res.transferId),
						isNull(transactions.deletedAt),
					),
				);
		}

		return res ?? null;
	});
}

export class TransferError extends Error {}

/**
 * Moves money between two of the user's active accounts as a pair of linked legs: outgoing
 * on the source, incoming on the destination. Both accounts must share a currency — there
 * are no FX rates to convert with.
 */
export async function createTransfer(
	usersId: string,
	input: {
		fromAccountId: string;
		toAccountId: string;
		amount: number;
		bookedAt: Date;
		description?: string;
	},
): Promise<{ transferId: string; from: TransactionResponse; to: TransactionResponse }> {
	const accounts = await db
		.select({
			id: bankAccounts.id,
			name: bankAccounts.name,
			currenciesId: bankAccounts.currenciesId,
		})
		.from(bankAccounts)
		.where(and(eq(bankAccounts.usersId, usersId), isNull(bankAccounts.deletedAt)));

	const from = accounts.find((account) => account.id === input.fromAccountId);
	const to = accounts.find((account) => account.id === input.toAccountId);
	if (!from || !to) throw new TransferError("Account not found");
	if (from.id === to.id) throw new TransferError("Pick two different accounts");
	if (from.currenciesId !== to.currenciesId) {
		throw new TransferError("Both accounts need the same currency to move money between them");
	}

	const transferId = randomUUID();
	const description = input.description || undefined;
	const leg = {
		usersId,
		amount: input.amount.toFixed(2),
		currenciesId: from.currenciesId,
		bookedAt: input.bookedAt,
		description,
		transferId,
	};

	const [outgoing, incoming] = await db.transaction(async (tx) => {
		const [outLeg] = await tx
			.insert(transactions)
			.values({ ...leg, accountsId: from.id, counterparty: to.name, type: "outgoing" })
			.returning({ id: transactions.id });
		const [inLeg] = await tx
			.insert(transactions)
			.values({ ...leg, accountsId: to.id, counterparty: from.name, type: "incoming" })
			.returning({ id: transactions.id });
		return [outLeg, inLeg];
	});

	const [fromLeg, toLeg] = await Promise.all([
		getUserTransaction(usersId, outgoing.id),
		getUserTransaction(usersId, incoming.id),
	]);
	if (!fromLeg || !toLeg) throw new Error("Transfer could not be read back");

	return { transferId, from: fromLeg, to: toLeg };
}

export interface GetTransactionCountsPerCategoryArgs {
	userId: string;
	dateFrom?: Date;
	dateTo?: Date;
	type?: "incoming" | "outgoing";
}

export interface TransactionCountsPerCategory {
	date: string;
	categoryId: string | null;
	categoryName: string | null;
	count: number;
	totalAmount: number;
}

export async function getTransactionCountsPerCategory(
	args: GetTransactionCountsPerCategoryArgs,
): Promise<TransactionCountsPerCategory[]> {
	const dateTo = args.dateTo ?? new Date();
	const dateFrom = args.dateFrom ?? new Date(dateTo.getTime() - 7 * 24 * 60 * 60 * 1000);
	const bookedDate = sql<string>`date(${transactions.bookedAt})`;

	const filters = [
		eq(transactions.usersId, args.userId),
		gte(transactions.bookedAt, dateFrom),
		lte(transactions.bookedAt, dateTo),
		isNull(transactions.deletedAt),
		isNull(transactions.transferId),
	];
	if (args.type) {
		filters.push(eq(transactions.type, args.type));
	}
	const whereClause = and(...filters);

	const stats = await db
		.select({
			date: bookedDate,
			categoryId: transactions.categoriesId,
			categoryName: categories.name,
			count: count(),
			totalAmount: sum(transactions.amount),
		})
		.from(transactions)
		.leftJoin(categories, eq(categories.id, transactions.categoriesId))
		.where(whereClause)
		.groupBy(bookedDate, transactions.categoriesId, categories.name)
		.orderBy(asc(bookedDate), asc(categories.name));

	return stats.map((row) => ({
		date: row.date,
		categoryId: row.categoryId,
		categoryName: row.categoryName,
		count: Number(row.count),
		totalAmount: Number(row.totalAmount ?? 0),
	}));
}
