import { NextRequest } from "next/server";
import { respondWithJSON, respondWithError } from "@/util/json";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTransactionCountsPerCategory } from "@/db/queries/transactions";

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const queryParams = req.nextUrl.searchParams;
	const queryDateFrom = queryParams.get("dateFrom");
	const queryDateTo = queryParams.get("dateTo");

	let dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	let dateTo = new Date(Date.now());
	if (queryDateFrom) dateFrom = new Date(Date.parse(queryDateFrom));
	if (queryDateTo) dateTo = new Date(Date.parse(queryDateTo));
	try {
		const statistics = await getTransactionCountsPerCategory({ userId: session.user.id, dateFrom: dateFrom, dateTo: dateTo });
		return respondWithJSON(200, statistics);
	} catch (err) {
		return respondWithError(500, "Error getting statistics", err);
	}

}


