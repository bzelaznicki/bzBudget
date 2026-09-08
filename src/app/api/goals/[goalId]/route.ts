import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteGoal, getUserGoal, InvalidGoalCurrencyError, updateGoal } from "@/db/queries/goals";
import { goalIdSchema, updateGoalSchema } from "@/lib/validation/goals";
import { respondWithError, respondWithJSON } from "@/util/json";

type Context = { params: Promise<{ goalId: string }> };

export async function GET(_req: Request, { params }: Context) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	const { goalId } = await params;
	if (!goalIdSchema.safeParse(goalId).success) return respondWithError(400, "Invalid goal ID");
	try {
		const goal = await getUserGoal(session.user.id, goalId);
		const response = goal ? respondWithJSON(200, goal) : respondWithError(404, "Goal not found");
		response.headers.set("Cache-Control", "no-store");
		return response;
	} catch (error) {
		return respondWithError(500, "Unable to load goal", error);
	}
}

export async function PATCH(req: Request, { params }: Context) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	const { goalId } = await params;
	if (!goalIdSchema.safeParse(goalId).success) return respondWithError(400, "Invalid goal ID");
	const parsed = updateGoalSchema.safeParse(await req.json().catch(() => null));
	if (!parsed.success) return respondWithError(400, parsed.error.issues[0].message);
	try {
		const goal = await updateGoal(session.user.id, goalId, parsed.data);
		return goal ? respondWithJSON(200, goal) : respondWithError(404, "Goal not found");
	} catch (error) {
		if (error instanceof InvalidGoalCurrencyError) return respondWithError(400, error.message);
		return respondWithError(500, "Unable to update goal", error);
	}
}

export async function DELETE(_req: Request, { params }: Context) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) return respondWithError(401, "Unauthorized");
	const { goalId } = await params;
	if (!goalIdSchema.safeParse(goalId).success) return respondWithError(400, "Invalid goal ID");
	try {
		return (await deleteGoal(session.user.id, goalId))
			? new Response(null, { status: 204 })
			: respondWithError(404, "Goal not found");
	} catch (error) {
		return respondWithError(500, "Unable to delete goal", error);
	}
}
