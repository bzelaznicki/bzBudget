import { headers } from "next/headers";

import { undeleteUserBankAccount } from "@/db/queries/accounts";
import { auth } from "@/lib/auth";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { accountIdSchema } from "@/lib/validation/accounts";
import { respondWithError, respondWithJSON } from "@/util/json";

/** Brings an archived account back into the account list and pickers. */
export async function POST(_req: Request, context: { params: Promise<{ accountId: string }> }) {
	const { accountId } = await context.params;
	if (!accountIdSchema.safeParse(accountId).success) {
		return respondWithError(400, "Invalid account id");
	}

	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const res = await undeleteUserBankAccount(session.user.id, accountId);
		if (!res) {
			return respondWithError(404, "Account not found");
		}

		await captureServerEvent(posthog, "account_restored", session.user.id, { accountId });
		return respondWithJSON(200, res);
	} catch (err) {
		await captureServerEvent(posthog, "account_restore_failed", session.user.id, {
			accountId,
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error restoring account", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
