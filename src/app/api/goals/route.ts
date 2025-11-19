import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { createGoal } from "@/db/queries/goals";
import { auth } from "@/lib/auth";

import { captureServerEvent, createServerPosthog, shutdownServerPosthog } from "@/lib/posthog-server";
import { respondWithJSON, respondWithError } from "@/util/json";

export async function POST(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const json = await req.json();

	} catch (err) {
		await captureServerEvent(posthog, "goal_create_error", session.user.id, {
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error creating transaction", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}

