import { headers } from "next/headers";

import {
	deleteBudget,
	updateBudget,
	type BudgetPeriod,
	type UpdateBudgetInput,
} from "@/db/queries/budgets";
import { auth } from "@/lib/auth";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function DELETE(_req: Request, context: { params: Promise<{ budgetId: string }> }) {
	const { budgetId } = await context.params;

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const success = await deleteBudget(session.user.id, budgetId);
		if (!success) {
			await captureServerEvent(posthog, "budget_delete_not_found", session.user.id, {
				budgetId,
			});
			return respondWithError(404, "Budget not found");
		}

		await captureServerEvent(posthog, "budget_deleted", session.user.id, {
			budgetId,
		});
		return respondWithJSON(204);
	} catch (err) {
		await captureServerEvent(posthog, "budget_delete_failed", session.user.id, {
			budgetId,
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error deleting budget", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}

export async function PATCH(req: Request, context: { params: Promise<{ budgetId: string }> }) {
	const { budgetId } = await context.params;

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const json = await req.json();
		const { amount, period, alertThreshold, emailAlerts } = json;

		const updateData: UpdateBudgetInput = {};

		if (amount !== undefined) {
			if (typeof amount !== "number" || amount <= 0) {
				await captureServerEvent(posthog, "budget_update_validation_failed", session.user.id, {
					field: "amount",
					value: amount,
				});
				return respondWithError(400, "Amount must be a positive number");
			}
			updateData.amount = amount;
		}

		if (period !== undefined) {
			if (!["weekly", "monthly", "yearly"].includes(period)) {
				await captureServerEvent(posthog, "budget_update_validation_failed", session.user.id, {
					field: "period",
					value: period,
				});
				return respondWithError(400, "Period must be weekly, monthly, or yearly");
			}
			updateData.period = period as BudgetPeriod;
		}

		if (alertThreshold !== undefined) {
			if (typeof alertThreshold !== "number" || alertThreshold < 1 || alertThreshold > 100) {
				await captureServerEvent(posthog, "budget_update_validation_failed", session.user.id, {
					field: "alertThreshold",
					value: alertThreshold,
				});
				return respondWithError(400, "Alert threshold must be between 1 and 100");
			}
			updateData.alertThreshold = alertThreshold;
		}

		if (emailAlerts !== undefined) {
			updateData.emailAlerts = emailAlerts;
		}

		if (Object.keys(updateData).length === 0) {
			return respondWithError(400, "No valid fields to update");
		}

		const budget = await updateBudget(session.user.id, budgetId, updateData);

		if (!budget) {
			await captureServerEvent(posthog, "budget_update_not_found", session.user.id, {
				budgetId,
			});
			return respondWithError(404, "Budget not found");
		}

		await captureServerEvent(posthog, "budget_updated", session.user.id, {
			budgetId: budget.id,
			updatedFields: Object.keys(updateData),
		});

		return respondWithJSON(200, budget);
	} catch (err) {
		await captureServerEvent(posthog, "budget_update_error", session.user.id, {
			budgetId,
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error updating budget", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
