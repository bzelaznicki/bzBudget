import { and, desc, eq, gte, lt, sql, sum } from "drizzle-orm";
import { db } from "../db";
import { budgets, budgetAlerts, transactions, categories, users, currencies } from "../schema";

export type BudgetPeriod = "weekly" | "monthly" | "yearly";
export type BudgetAlertType = "threshold" | "exceeded";

export interface BudgetResponse {
	id: string;
	amount: string;
	period: BudgetPeriod;
	alertThreshold: number;
	emailAlerts: boolean;
	category: {
		id: string | null;
		name: string;
	} | null;
	createdAt: Date | null;
	updatedAt: Date | null;
}

export interface BudgetWithSpending extends BudgetResponse {
	currentSpending: number;
	utilizationPercentage: number;
	isOverBudget: boolean;
	isThresholdReached: boolean;
}

export interface CreateBudgetInput {
	usersId: string;
	categoriesId: string | null;
	amount: number;
	period: BudgetPeriod;
	alertThreshold: number;
	emailAlerts: boolean;
}

export interface UpdateBudgetInput {
	amount?: number;
	period?: BudgetPeriod;
	alertThreshold?: number;
	emailAlerts?: boolean;
}

function getPeriodDateRange(
	period: BudgetPeriod,
	weekStartDay: number,
): { start: Date; end: Date } {
	const now = new Date();
	const start = new Date(now);
	const end = new Date(now);

	switch (period) {
		case "weekly": {
			const currentDay = now.getDay();
			const daysSinceStart = (currentDay - weekStartDay + 7) % 7;
			start.setDate(now.getDate() - daysSinceStart);
			start.setHours(0, 0, 0, 0);
			end.setDate(start.getDate() + 7);
			end.setHours(0, 0, 0, 0);
			break;
		}
		case "monthly": {
			start.setDate(1);
			start.setHours(0, 0, 0, 0);
			end.setMonth(start.getMonth() + 1);
			end.setDate(1);
			end.setHours(0, 0, 0, 0);
			break;
		}
		case "yearly": {
			start.setMonth(0, 1);
			start.setHours(0, 0, 0, 0);
			end.setFullYear(start.getFullYear() + 1, 0, 1);
			end.setHours(0, 0, 0, 0);
			break;
		}
	}

	return { start, end };
}

async function getUserWeekStartDay(usersId: string): Promise<number> {
	const user = await db.query.users.findFirst({
		where: eq(users.id, usersId),
		columns: { weekStartDay: true },
	});
	return user?.weekStartDay ?? 0;
}

export async function listBudgetsWithSpending(
	usersId: string,
): Promise<BudgetWithSpending[] | null> {
	if (!usersId) {
		return null;
	}

	const weekStartDay = await getUserWeekStartDay(usersId);

	const budgetRows = await db
		.select({
			id: budgets.id,
			amount: budgets.amount,
			period: budgets.period,
			alertThreshold: budgets.alertThreshold,
			emailAlerts: budgets.emailAlerts,
			categoryId: categories.id,
			categoryName: categories.name,
			createdAt: budgets.createdAt,
			updatedAt: budgets.updatedAt,
		})
		.from(budgets)
		.leftJoin(categories, eq(budgets.categoriesId, categories.id))
		.where(eq(budgets.usersId, usersId))
		.orderBy(desc(budgets.createdAt));

	const budgetsWithSpending: BudgetWithSpending[] = [];

	for (const row of budgetRows) {
		const { start, end } = getPeriodDateRange(row.period, weekStartDay);

		const conditions = [
			eq(transactions.usersId, usersId),
			gte(transactions.bookedAt, start),
			lt(transactions.bookedAt, end),
			eq(transactions.type, "outgoing"),
		];
		if (row.categoryId) {
			conditions.push(eq(transactions.categoriesId, row.categoryId));
		}

		const spendingResult = await db
			.select({
				total: sum(transactions.amount),
			})
			.from(transactions)
			.where(and(...conditions));

		const currentSpending = Number(spendingResult[0]?.total ?? 0);
		const budgetAmount = Number(row.amount);
		const utilizationPercentage = budgetAmount > 0 ? (currentSpending / budgetAmount) * 100 : 0;
		const isOverBudget = currentSpending > budgetAmount;
		const isThresholdReached = utilizationPercentage >= row.alertThreshold;

		budgetsWithSpending.push({
			id: row.id,
			amount: row.amount,
			period: row.period,
			alertThreshold: row.alertThreshold,
			emailAlerts: row.emailAlerts,
			category: row.categoryId ? { id: row.categoryId, name: row.categoryName! } : null,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			currentSpending,
			utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
			isOverBudget,
			isThresholdReached,
		});
	}

	return budgetsWithSpending;
}

export async function getBudgetById(
	usersId: string,
	budgetId: string,
): Promise<BudgetWithSpending | null> {
	if (!usersId || !budgetId) {
		return null;
	}

	const weekStartDay = await getUserWeekStartDay(usersId);

	const [row] = await db
		.select({
			id: budgets.id,
			amount: budgets.amount,
			period: budgets.period,
			alertThreshold: budgets.alertThreshold,
			emailAlerts: budgets.emailAlerts,
			categoryId: categories.id,
			categoryName: categories.name,
			createdAt: budgets.createdAt,
			updatedAt: budgets.updatedAt,
		})
		.from(budgets)
		.leftJoin(categories, eq(budgets.categoriesId, categories.id))
		.where(and(eq(budgets.id, budgetId), eq(budgets.usersId, usersId)));

	if (!row) {
		return null;
	}

	const { start, end } = getPeriodDateRange(row.period, weekStartDay);

	const conditions = [
		eq(transactions.usersId, usersId),
		gte(transactions.bookedAt, start),
		lt(transactions.bookedAt, end),
		eq(transactions.type, "outgoing"),
	];
	if (row.categoryId) {
		conditions.push(eq(transactions.categoriesId, row.categoryId));
	}

	const spendingResult = await db
		.select({
			total: sum(transactions.amount),
		})
		.from(transactions)
		.where(and(...conditions));

	const currentSpending = Number(spendingResult[0]?.total ?? 0);
	const budgetAmount = Number(row.amount);
	const utilizationPercentage = budgetAmount > 0 ? (currentSpending / budgetAmount) * 100 : 0;

	return {
		id: row.id,
		amount: row.amount,
		period: row.period,
		alertThreshold: row.alertThreshold,
		emailAlerts: row.emailAlerts,
		category: row.categoryId ? { id: row.categoryId, name: row.categoryName! } : null,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		currentSpending,
		utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
		isOverBudget: currentSpending > budgetAmount,
		isThresholdReached: utilizationPercentage >= row.alertThreshold,
	};
}

export async function createBudget(input: CreateBudgetInput): Promise<BudgetResponse | null> {
	try {
		const [budget] = await db
			.insert(budgets)
			.values({
				usersId: input.usersId,
				categoriesId: input.categoriesId,
				amount: String(input.amount),
				period: input.period,
				alertThreshold: input.alertThreshold,
				emailAlerts: input.emailAlerts,
			})
			.returning({
				id: budgets.id,
				amount: budgets.amount,
				period: budgets.period,
				alertThreshold: budgets.alertThreshold,
				emailAlerts: budgets.emailAlerts,
				categoriesId: budgets.categoriesId,
				createdAt: budgets.createdAt,
				updatedAt: budgets.updatedAt,
			});

		let category: { id: string | null; name: string } | null = null;
		if (budget.categoriesId) {
			const cat = await db.query.categories.findFirst({
				where: eq(categories.id, budget.categoriesId),
				columns: { id: true, name: true },
			});
			if (cat) {
				category = { id: cat.id, name: cat.name };
			}
		}

		return {
			id: budget.id,
			amount: budget.amount,
			period: budget.period,
			alertThreshold: budget.alertThreshold,
			emailAlerts: budget.emailAlerts,
			category,
			createdAt: budget.createdAt,
			updatedAt: budget.updatedAt,
		};
	} catch (error) {
		console.error("Error creating budget:", error);
		return null;
	}
}

export async function updateBudget(
	usersId: string,
	budgetId: string,
	input: UpdateBudgetInput,
): Promise<BudgetResponse | null> {
	try {
		const updateData: Partial<typeof budgets.$inferInsert> = {
			updatedAt: new Date(),
		};

		if (input.amount !== undefined) {
			updateData.amount = String(input.amount);
		}
		if (input.period !== undefined) {
			updateData.period = input.period;
		}
		if (input.alertThreshold !== undefined) {
			updateData.alertThreshold = input.alertThreshold;
		}
		if (input.emailAlerts !== undefined) {
			updateData.emailAlerts = input.emailAlerts;
		}

		const [budget] = await db
			.update(budgets)
			.set(updateData)
			.where(and(eq(budgets.id, budgetId), eq(budgets.usersId, usersId)))
			.returning({
				id: budgets.id,
				amount: budgets.amount,
				period: budgets.period,
				alertThreshold: budgets.alertThreshold,
				emailAlerts: budgets.emailAlerts,
				categoriesId: budgets.categoriesId,
				createdAt: budgets.createdAt,
				updatedAt: budgets.updatedAt,
			});

		if (!budget) {
			return null;
		}

		let category: { id: string | null; name: string } | null = null;
		if (budget.categoriesId) {
			const cat = await db.query.categories.findFirst({
				where: eq(categories.id, budget.categoriesId),
				columns: { id: true, name: true },
			});
			if (cat) {
				category = { id: cat.id, name: cat.name };
			}
		}

		return {
			id: budget.id,
			amount: budget.amount,
			period: budget.period,
			alertThreshold: budget.alertThreshold,
			emailAlerts: budget.emailAlerts,
			category,
			createdAt: budget.createdAt,
			updatedAt: budget.updatedAt,
		};
	} catch (error) {
		console.error("Error updating budget:", error);
		return null;
	}
}

export async function deleteBudget(usersId: string, budgetId: string): Promise<boolean> {
	try {
		const result = await db
			.delete(budgets)
			.where(and(eq(budgets.id, budgetId), eq(budgets.usersId, usersId)))
			.returning({ id: budgets.id });

		return result.length > 0;
	} catch (error) {
		console.error("Error deleting budget:", error);
		return false;
	}
}

export async function hasAlertBeenSent(
	budgetsId: string,
	alertType: BudgetAlertType,
	usersId: string,
): Promise<boolean> {
	const weekStartDay = await getUserWeekStartDay(usersId);

	const budget = await db.query.budgets.findFirst({
		where: eq(budgets.id, budgetsId),
		columns: { period: true },
	});

	if (!budget) {
		return false;
	}

	const { start } = getPeriodDateRange(budget.period, weekStartDay);

	const existingAlert = await db.query.budgetAlerts.findFirst({
		where: and(
			eq(budgetAlerts.budgetsId, budgetsId),
			eq(budgetAlerts.alertType, alertType),
			eq(budgetAlerts.usersId, usersId),
			gte(budgetAlerts.sentAt, start),
		),
	});

	return !!existingAlert;
}

export async function recordBudgetAlert(
	budgetsId: string,
	usersId: string,
	alertType: BudgetAlertType,
	spendingAtAlert: number,
): Promise<void> {
	await db.insert(budgetAlerts).values({
		budgetsId,
		usersId,
		alertType,
		sentAt: new Date(),
		spendingAtAlert: String(spendingAtAlert),
	});
}

export async function getTopBudgetsByUtilization(
	usersId: string,
	limit: number = 3,
): Promise<BudgetWithSpending[] | null> {
	const allBudgets = await listBudgetsWithSpending(usersId);
	if (!allBudgets) {
		return null;
	}

	return allBudgets
		.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
		.slice(0, limit);
}

export async function checkBudgetsAndSendAlerts(usersId: string): Promise<void> {
	const user = await db.query.users.findFirst({
		where: eq(users.id, usersId),
		columns: { email: true, name: true, weekStartDay: true, defaultCurrenciesId: true },
	});

	if (!user || !user.email) {
		return;
	}

	// Fetch user's default currency
	let currencyCode = "USD";
	if (user.defaultCurrenciesId) {
		const currency = await db.query.currencies.findFirst({
			where: eq(currencies.id, user.defaultCurrenciesId),
			columns: { isoCode: true },
		});
		if (currency) {
			currencyCode = currency.isoCode;
		}
	}

	const allBudgets = await listBudgetsWithSpending(usersId);
	if (!allBudgets) {
		return;
	}

	const { sendBudgetExceededAlert, sendBudgetThresholdAlert } = await import("@/lib/inbound");

	for (const budget of allBudgets) {
		if (!budget.emailAlerts) {
			continue;
		}

		if (budget.isOverBudget) {
			const hasBeenSent = await hasAlertBeenSent(budget.id, "exceeded", usersId);
			if (!hasBeenSent) {
				await sendBudgetExceededAlert(
					user.email,
					user.name ?? "",
					budget.category?.name ?? "Overall",
					budget.period,
					Number(budget.amount),
					budget.currentSpending,
					currencyCode,
				);
				await recordBudgetAlert(budget.id, usersId, "exceeded", budget.currentSpending);
			}
		} else if (budget.isThresholdReached) {
			const hasBeenSent = await hasAlertBeenSent(budget.id, "threshold", usersId);
			if (!hasBeenSent) {
				await sendBudgetThresholdAlert(
					user.email,
					user.name ?? "",
					budget.category?.name ?? "Overall",
					budget.period,
					Number(budget.amount),
					budget.currentSpending,
					budget.alertThreshold,
					currencyCode,
				);
				await recordBudgetAlert(budget.id, usersId, "threshold", budget.currentSpending);
			}
		}
	}
}
