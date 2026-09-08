import { headers } from "next/headers";
import { NextRequest } from "next/server";

import {
	createBudget,
	listBudgetsWithSpending,
	getTopBudgetsByUtilization,
	InvalidBudgetCategoryError,
} from "@/db/queries/budgets";
import { createBudgetPayloadSchema } from "@/lib/validation/budgets";
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
		const parsed = createBudgetPayloadSchema.safeParse(await req.json().catch(() => null));
		if (!parsed.success) {
			return respondWithError(400, "Invalid budget data", parsed.error.flatten());
		}
		const { categoriesId, period } = parsed.data;
		const input = { ...parsed.data, usersId: session.user.id };

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
		if (err instanceof InvalidBudgetCategoryError) {
			return respondWithError(400, "Invalid category");
		}
		await captureServerEvent(posthog, "budget_create_error", session.user.id, {
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error creating budget", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
