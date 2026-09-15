import { headers } from "next/headers";

import { checkBudgetsAndSendAlerts } from "@/db/queries/budgets";
import {
	deleteUserTransaction,
	TransactionUpdateError,
	updateUserTransaction,
} from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { transactionUpdateSchema } from "@/lib/validation/transactions";
import { respondWithJSON, respondWithError } from "@/util/json";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: Request, context: { params: Promise<{ transactionId: string }> }) {
	const { transactionId } = await context.params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	if (!UUID_PATTERN.test(transactionId)) return respondWithError(404, "Transaction not found");

	const parsed = transactionUpdateSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) {
		return respondWithError(400, parsed.error.issues[0]?.message ?? "Invalid update");
	}

	const posthog = createServerPosthog();

	try {
		const { bookedAt, ...rest } = parsed.data;
		const transaction = await updateUserTransaction(session.user.id, transactionId, {
			...rest,
			...(bookedAt !== undefined ? { bookedAt: new Date(bookedAt) } : {}),
		});
		if (!transaction) return respondWithError(404, "Transaction not found");

		await captureServerEvent(posthog, "transaction_updated", session.user.id, {
			transactionId,
			fields: Object.keys(parsed.data),
			isTransfer: Boolean(transaction.transferId),
		});

		// A new category or date can move spending into a budget that is now over its limit.
		if (transaction.type === "outgoing" && ("categoriesId" in rest || bookedAt !== undefined)) {
			void checkBudgetsAndSendAlerts(session.user.id).catch((err) => {
				console.error("Error checking budgets after transaction update:", err);
			});
		}

		return respondWithJSON(200, transaction);
	} catch (err) {
		if (err instanceof TransactionUpdateError) return respondWithError(400, err.message);
		await captureServerEvent(posthog, "transaction_update_failed", session.user.id, {
			transactionId,
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error updating transaction", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}

export async function DELETE(
	_req: Request,
	context: { params: Promise<{ transactionId: string }> },
) {
	const { transactionId } = await context.params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	if (!UUID_PATTERN.test(transactionId)) return respondWithError(404, "Transaction not found");

	const posthog = createServerPosthog();

	try {
		const res = await deleteUserTransaction(session.user.id, transactionId);
		if (!res) {
			await captureServerEvent(posthog, "transaction_delete_not_found", session.user.id, {
				transactionId,
			});
			return respondWithError(404, "Transaction not found");
		}

		const amount = Number(res.amount);

		await captureServerEvent(posthog, "transaction_deleted", session.user.id, {
			transactionId,
			accountId: res.accountsId,
			amount: Number.isFinite(amount) ? amount : undefined,
			hasExternalId: Boolean(res.externalId),
			isTransfer: Boolean(res.transferId),
			type: res.type,
		});

		return respondWithJSON(204);
	} catch (err) {
		await captureServerEvent(posthog, "transaction_delete_failed", session.user.id, {
			transactionId,
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error deleting transaction", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
