import { headers } from "next/headers";

import { deleteUserBankAccount } from "@/db/queries/accounts";
import { auth } from "@/lib/auth";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function DELETE(_req: Request, context: { params: Promise<{ accountId: string }> }) {
	{
		const { accountId } = await context.params;

		const session = await auth.api.getSession({ headers: await headers() });
		if (!session) return respondWithError(401, "Unauthorized");

		try {
			const res = await deleteUserBankAccount(session.user.id, accountId);
			if (!res) return respondWithError(404, "Account not found");
			respondWithJSON(204);
		} catch (err) {
			return respondWithError(500, "Error deleting account", err);
		}
	}
}