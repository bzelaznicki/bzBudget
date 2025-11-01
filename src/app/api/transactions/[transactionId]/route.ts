import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { deleteUserTransaction } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { respondWithError } from "@/util/json";

export async function DELETE(req: NextRequest, ctx: { params: { transactionId: string } }) {
	const session = await auth.api.getSession({ headers: await headers() });

	const { transactionId } = ctx.params;
	if (!session) return respondWithError(401, "Unauthorized");

	try {
		const res = await deleteUserTransaction(session.user.id, transactionId);

	} catch (err: unknown) {

	}
}
