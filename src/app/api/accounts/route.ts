import { NextRequest } from "next/server";
import { respondWithJSON, respondWithError } from "@/util/json";
import { getUserBankAccounts } from "@/db/queries/accounts";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");
	try {
		const searchParams = req.nextUrl.searchParams;
		const limit = searchParams.get("limit");

		let limitNum: number | undefined;

		if (limit) {
			limitNum = parseInt(limit);
			if (isNaN(limitNum)) return respondWithError(400, "Limit must be a number");
		}
		const offset = searchParams.get("page");
		let offsetNum: number | undefined;

		if (offset) {
			offsetNum = parseInt(offset);
			if (isNaN(offsetNum)) return respondWithError(400, "Offset must be a number");
		}
		const res = await getUserBankAccounts(session.user.id, limitNum, offsetNum);

		if (!res) return respondWithJSON(200, []);
		return respondWithJSON(200, res);
	} catch (err) {
		return respondWithError(500, "Internal Server Error", err);
	}
}
