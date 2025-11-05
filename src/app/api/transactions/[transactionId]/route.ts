import { headers } from "next/headers";

import { deleteUserTransaction } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { respondWithJSON, respondWithError } from "@/util/json";

export async function DELETE(
	_req: Request,
	context: { params: Promise<{ transactionId: string }> }
) {
	const { transactionId } = await context.params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

	try {
		const res = await deleteUserTransaction(session.user.id, transactionId);
		if (!res) return respondWithError(404, "Transaction not found");
		return respondWithJSON(204);
	} catch (err) {
		return respondWithError(500, "Error deleting transaction", err);
	}
}
