import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { createGoal, InvalidGoalCurrencyError, listUserGoals } from "@/db/queries/goals";
import { createGoalSchema, goalListSchema } from "@/lib/validation/goals";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	const parsed = goalListSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
	if (!parsed.success) return respondWithError(400, "Invalid goals filter");
	try {
		return respondWithJSON(200, await listUserGoals(session.user.id, parsed.data.status));
	} catch (error) {
		return respondWithError(500, "Unable to load goals", error);
	}
}

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	const parsed = createGoalSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) return respondWithError(400, parsed.error.issues[0].message);
	try {
		return respondWithJSON(201, await createGoal(session.user.id, parsed.data));
	} catch (error) {
		if (error instanceof InvalidGoalCurrencyError) return respondWithError(400, error.message);
		return respondWithError(500, "Unable to create goal", error);
	}
}
