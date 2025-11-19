import { asc, desc, eq, gte, isNotNull } from "drizzle-orm";
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
	const dir = args.dir === "asc" ? "asc" : "desc";

	const filters = [eq(goals.usersId, args.usersId)];

	let orderField = desc(goals.endDate);

	switch (args.sortField) {
		case "name":
			orderField = dir === "asc" ? asc(goals.name) : desc(goals.name);
			break;
		case "status":
			orderField = dir === "asc" ? asc(goals.status) : desc(goals.status);
			break;
		case "period":
			orderField = dir === "asc" ? asc(goals.period) : desc(goals.period);
			break;
		case "dueDate":
			orderField = dir === "asc" ? asc(goals.endDate) : desc(goals.endDate);
			break;
		case "startDate":
			orderField = dir === "asc" ? asc(goals.startDate) : desc(goals.startDate);
			break;
		case "targetAmount":
			orderField = dir === "asc" ? asc(goals.targetAmount) : desc(goals.targetAmount);
			break;
		default:
			asc(goals.endDate);
	}

	if (args.categoriesId) {
		filters.push(eq(goals.categoriesId, args.categoriesId));
	}
	if (args.deleted && args.deleted === true) {
		filters.push(isNotNull(goals.deletedAt));
	}
	if (args.deletedFrom) {
		filters.push(gte(goals.deletedAt, args.deletedFrom));
	}
}
