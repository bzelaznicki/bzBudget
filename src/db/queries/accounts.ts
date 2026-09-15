import { bankAccounts } from "../schema";
import { db } from "../db";
import { eq, and, desc, isNotNull, isNull } from "drizzle-orm";

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

/** One account the user owns, archived or not — the detail page shows both. */
export async function getUserBankAccount(
	usersId: string,
	bankAccountsId: string,
): Promise<BankAccountResponse | null> {
	const [account] = await db
		.select()
		.from(bankAccounts)
		.where(and(eq(bankAccounts.usersId, usersId), eq(bankAccounts.id, bankAccountsId)))
		.limit(1);

	return account ?? null;
}

/**
 * Archived accounts, most recently archived first. Archiving is the soft delete: the row
 * keeps its transactions and can be restored.
 */
export async function getArchivedBankAccounts(usersId: string): Promise<BankAccountResponse[]> {
	return db
		.select()
		.from(bankAccounts)
		.where(and(eq(bankAccounts.usersId, usersId), isNotNull(bankAccounts.deletedAt)))
		.orderBy(desc(bankAccounts.deletedAt));
}

export async function deleteUserBankAccount(
	usersId: string,
	bankAccountsId: string,
): Promise<BankAccountResponse | null> {
	const timestamp = new Date();
	const query = db.update(bankAccounts).set({ updatedAt: timestamp, deletedAt: timestamp });
	type WhereClause = Parameters<(typeof query)["where"]>[0];
	const condition = and(eq(bankAccounts.usersId, usersId), eq(bankAccounts.id, bankAccountsId));
	const res = await query.where(condition as WhereClause).returning();

	return res[0] ?? null;
}

export async function undeleteUserBankAccount(
	usersId: string,
	bankAccountsId: string,
): Promise<BankAccountResponse | null> {
	const timestamp = new Date();
	const query = db.update(bankAccounts).set({ updatedAt: timestamp, deletedAt: null });
	type WhereClause = Parameters<(typeof query)["where"]>[0];
	const condition = and(eq(bankAccounts.usersId, usersId), eq(bankAccounts.id, bankAccountsId));
	const res = await query.where(condition as WhereClause).returning();

	return res[0] ?? null;
}
