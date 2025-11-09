import { headers } from "next/headers";

import { deleteUserBankAccount } from "@/db/queries/accounts";
import { auth } from "@/lib/auth";
import { captureServerEvent, createServerPosthog, shutdownServerPosthog } from "@/lib/posthog-server";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function DELETE(_req: Request, context: { params: Promise<{ accountId: string }> }) {
	{
		const { accountId } = await context.params;

		const session = await auth.api.getSession({ headers: await headers() });
		if (!session) return respondWithError(401, "Unauthorized");

		const posthog = createServerPosthog();

		try {
			const res = await deleteUserBankAccount(session.user.id, accountId);
			if (!res) {
				await captureServerEvent(posthog, "account_delete_not_found", session.user.id, {
					accountId,
				});
				return respondWithError(404, "Account not found");
			}

			await captureServerEvent(posthog, "account_deleted", session.user.id, {
				accountId,
			});
			return respondWithJSON(204);
		} catch (err) {
			await captureServerEvent(posthog, "account_delete_failed", session.user.id, {
				accountId,
				error: err instanceof Error ? err.message : String(err),
			});
			return respondWithError(500, "Error deleting account", err);
		} finally {
			await shutdownServerPosthog(posthog);
		}
	}
}
