import { headers } from "next/headers";

import { createTransfer, TransferError } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { transferPayloadSchema } from "@/lib/validation/transactions";
import { respondWithError, respondWithJSON } from "@/util/json";

/** Moves money between two of the signed-in user's accounts. */
export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");

	const parsed = transferPayloadSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) {
		return respondWithError(400, parsed.error.issues[0]?.message ?? "Invalid transfer");
	}

	const posthog = createServerPosthog();

	try {
		const { bookedAt, ...rest } = parsed.data;
		const transfer = await createTransfer(session.user.id, {
			...rest,
			bookedAt: bookedAt ? new Date(bookedAt) : new Date(),
		});

		await captureServerEvent(posthog, "transfer_created", session.user.id, {
			transferId: transfer.transferId,
			amount: parsed.data.amount,
		});

		return respondWithJSON(201, transfer);
	} catch (err) {
		if (err instanceof TransferError) return respondWithError(400, err.message);
		await captureServerEvent(posthog, "transfer_create_failed", session.user.id, {
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error moving money", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}
