import { bankAccounts } from "../schema";
import { db } from "../db";
import { eq, and, isNull } from "drizzle-orm";

export interface BankAccountResponse {
	id: string;
	usersId: string;
	name: string;
	iban: string | null;
	currenciesId: string;
	createdAt: Date | null;
	updatedAt: Date | null;
	deletedAt: Date | null;
}

export async function createBankAccount(
	usersId: string,
	name: string,
	currenciesId: string,
	iban?: string,
): Promise<BankAccountResponse | null> {
	const bankAccount = await db
		.insert(bankAccounts)
		.values({
			usersId,
			name,
			iban,
			currenciesId,
		})
		.returning();

	return bankAccount.length > 0 ? bankAccount[0] : null;
}

export async function getUserBankAccounts(
	usersId: string,
	limit?: number,
	offset?: number,
): Promise<BankAccountResponse[] | null> {
	if (!limit) limit = 10;
	if (!offset) offset = 0;

	const accounts = await db
		.select()
		.from(bankAccounts)
		.where(and(eq(bankAccounts.usersId, usersId), isNull(bankAccounts.deletedAt)))
		.limit(limit)
		.offset(offset);

	return accounts.length > 0 ? accounts : null;
}


export async function deleteUserBankAccount(usersId: string, bankAccountsId: string): Promise<BankAccountResponse | null> {
	const timestamp = new Date();
	const res = await db.update(bankAccounts).set({ updatedAt: timestamp, deletedAt: timestamp, }).where(and(
		(eq(bankAccounts.usersId, usersId),
			eq(bankAccounts.id, bankAccountsId)))).returning();

	return res[0] ?? null;


}

export async function undeleteUserBankAccount(usersId: string, bankAccountsId: string): Promise<BankAccountResponse | null> {
	const timestamp = new Date();
	const res = await db.update(bankAccounts).set({ updatedAt: timestamp, deletedAt: null, }).where(and(
		(eq(bankAccounts.usersId, usersId),
			eq(bankAccounts.id, bankAccountsId)))).returning();

	return res[0] ?? null;


}
