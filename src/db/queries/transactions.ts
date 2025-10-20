import { eq } from "drizzle-orm";
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

export async function createTransaction(userId: string, accountsId: string, amount: number, counterparty: string, currenciesId: string, bookedAt: Date, type: "incoming" | "outgoing", description?: string, categoriesId?: string, externalId?: string): Promise<TransactionResponse | null> {
	const transaction = await db.insert(transactions).values({
		usersId: userId, accountsId, amount: amount.toString(), counterparty, currenciesId, bookedAt, type, description, categoriesId, externalId,
	}).returning();
	return transaction.length > 0 ? transaction[0] : null; 
}

export async function getUserTransactions(usersId: string, limit?: number, offset?: number): Promise<TransactionResponse[] | null> {
	
		if (!limit) limit = 10;
		if (!offset) offset = 0;

		const userTransactions = await db.select().from(transactions).where(eq(transactions.usersId, usersId)).limit(limit).offset(offset);

		return userTransactions ? userTransactions : null;
}
