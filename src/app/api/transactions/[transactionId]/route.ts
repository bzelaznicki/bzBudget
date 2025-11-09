import { headers } from "next/headers";

import { deleteUserTransaction } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { captureServerEvent, createServerPosthog, shutdownServerPosthog } from "@/lib/posthog-server";
import { respondWithJSON, respondWithError } from "@/util/json";

export async function DELETE(
	_req: Request,
	context: { params: Promise<{ transactionId: string }> }
) {
	const { transactionId } = await context.params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

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
