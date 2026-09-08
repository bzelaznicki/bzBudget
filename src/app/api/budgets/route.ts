import { headers } from "next/headers";
import { NextRequest } from "next/server";

import {
	createBudget,
	listBudgetsWithSpending,
	getTopBudgetsByUtilization,
	type BudgetPeriod,
	type CreateBudgetInput,
} from "@/db/queries/budgets";
import { auth } from "@/lib/auth";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const searchParams = req.nextUrl.searchParams;
	const summary = searchParams.get("summary");

	try {
		if (summary === "top") {
			const budgets = await getTopBudgetsByUtilization(session.user.id, 3);
			return respondWithJSON(200, budgets ?? []);
		}

		const budgets = await listBudgetsWithSpending(session.user.id);
		return respondWithJSON(200, budgets ?? []);
	} catch (err) {
		return respondWithError(500, "Error fetching budgets", err);
	}
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const json = await req.json();

		const { amount, period, alertThreshold, emailAlerts, categoriesId } = json;

		if (typeof amount !== "number" || amount <= 0) {
			await captureServerEvent(posthog, "budget_create_validation_failed", session.user.id, {
				field: "amount",
				value: amount,
			});
			return respondWithError(400, "Amount must be a positive number");
		}

		if (!["weekly", "monthly", "yearly"].includes(period)) {
			await captureServerEvent(posthog, "budget_create_validation_failed", session.user.id, {
				field: "period",
				value: period,
			});
			return respondWithError(400, "Period must be weekly, monthly, or yearly");
		}

		if (typeof alertThreshold !== "number" || alertThreshold < 1 || alertThreshold > 100) {
			await captureServerEvent(posthog, "budget_create_validation_failed", session.user.id, {
				field: "alertThreshold",
				value: alertThreshold,
			});
			return respondWithError(400, "Alert threshold must be between 1 and 100");
		}

		const input: CreateBudgetInput = {
			usersId: session.user.id,
			categoriesId: categoriesId ?? null,
			amount,
			period: period as BudgetPeriod,
			alertThreshold,
			emailAlerts: emailAlerts ?? true,
		};

		const budget = await createBudget(input);

		if (!budget) {
			await captureServerEvent(posthog, "budget_create_failed", session.user.id, {
				categoriesId,
				period,
			});
			return respondWithError(500, "Budget could not be created");
		}

		await captureServerEvent(posthog, "budget_created", session.user.id, {
			budgetId: budget.id,
			categoriesId: budget.category?.id ?? null,
			period: budget.period,
			amount: Number(budget.amount),
		});

		return respondWithJSON(201, budget);
	} catch (err) {
		await captureServerEvent(posthog, "budget_create_error", session.user.id, {
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error creating budget", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
