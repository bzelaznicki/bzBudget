import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/db";
import { currencies, goals } from "@/db/schema";
import type { CreateGoalInput, GoalStatus, UpdateGoalInput } from "@/lib/validation/goals";

export class InvalidGoalCurrencyError extends Error {
	constructor() {
		super("Select a valid currency");
		this.name = "InvalidGoalCurrencyError";
	}
}

const ownedGoal = (usersId: string, goalId: string) =>
	and(eq(goals.id, goalId), eq(goals.usersId, usersId), isNull(goals.deletedAt));

async function validateCurrency(currenciesId: string) {
	const [currency] = await db
		.select({ id: currencies.id })
		.from(currencies)
		.where(eq(currencies.id, currenciesId));
	if (!currency) throw new InvalidGoalCurrencyError();
}

export async function listUserGoals(usersId: string, status?: GoalStatus) {
	return db
		.select()
		.from(goals)
		.where(
			and(
				eq(goals.usersId, usersId),
				isNull(goals.deletedAt),
				status ? eq(goals.status, status) : undefined,
			),
		)
		.orderBy(desc(goals.createdAt), desc(goals.id));
}

export async function getUserGoal(usersId: string, goalId: string) {
	const [goal] = await db.select().from(goals).where(ownedGoal(usersId, goalId));
	return goal ?? null;
}

export async function createGoal(usersId: string, input: CreateGoalInput) {
	await validateCurrency(input.currenciesId);
	const [goal] = await db
		.insert(goals)
		.values({ ...input, usersId })
		.returning();
	return goal;
}

export async function updateGoal(usersId: string, goalId: string, input: UpdateGoalInput) {
	if (!(await getUserGoal(usersId, goalId))) return null;
	if (input.currenciesId !== undefined) await validateCurrency(input.currenciesId);
	const [goal] = await db
		.update(goals)
		.set({ ...input, updatedAt: new Date() })
		.where(ownedGoal(usersId, goalId))
		.returning();
	return goal ?? null;
}

export async function deleteGoal(usersId: string, goalId: string) {
	const now = new Date();
	const [goal] = await db
		.update(goals)
		.set({ deletedAt: now, updatedAt: now })
		.where(ownedGoal(usersId, goalId))
		.returning({ id: goals.id });
	return !!goal;
}
