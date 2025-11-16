import { db } from "../db";
import { goals } from "../schema";

export interface GetUserGoalsArgs {
	usersId: string;
	status?: ("active" | "completed" | "missed" | "paused")[];
	period?: ("one-time" | "monthly" | "weekly" | "yearly")[];
	categoriesId?: string;
	limit?: number;
	offset?: number;
	deleted?: boolean;
	deletedFrom?: Date;
	deletedTo?: Date;
	dir?: "asc" | "desc";
	sortField?: "name" | "status" | "targetAmount" | "period" | "startDate" | "dueDate";
}
const toDateString = (date?: Date) => date?.toISOString().slice(0, 10);

export async function createGoal(usersId: string, name: string, targetAmount: number, goalType: "saving" | "spending", period: "one-time" | "monthly" | "weekly" | "yearly", startDate?: Date, endDate?: Date, categoriesId?: string, description?: string) {

	const goalValues = {
		usersId,
		name,
		targetAmount: targetAmount.toString(),
		goalType,
		period,
		...(startDate && { startDate: toDateString(startDate) }),
		...(endDate && { endDate: toDateString(endDate) }),
		...(categoriesId && { categoriesId }),
		...(description && { description }),
	} satisfies typeof goals.$inferInsert;

	const resp = await db.insert(goals).values(goalValues).returning();

	return resp[0] ?? null;

}

export async function getUserGoals(args: GetUserGoalsArgs) {
	const limit = args.limit ?? 10;
	const offset = args.offset ?? 0;

}
