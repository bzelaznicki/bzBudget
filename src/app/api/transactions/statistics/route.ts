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
	const queryType = queryParams.get("type");

	let type: "incoming" | "outgoing" | undefined;
	if (queryType === "incoming" || queryType === "outgoing") {
		type = queryType;
	} else if (queryType) {
		return respondWithError(400, "Invalid transaction type");
	}

	let dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	let dateTo = new Date(Date.now());

	if (queryDateFrom) {
		const parsed = new Date(Date.parse(queryDateFrom));
		if (Number.isNaN(parsed.getTime())) {
			return respondWithError(400, "Invalid dateFrom value");
		}
		dateFrom = parsed;
	}

	if (queryDateTo) {
		const parsed = new Date(Date.parse(queryDateTo));
		if (Number.isNaN(parsed.getTime())) {
			return respondWithError(400, "Invalid dateTo value");
		}
		dateTo = parsed;
	}

	const normalizedDateFrom = new Date(dateFrom);
	normalizedDateFrom.setUTCHours(0, 0, 0, 0);
	const normalizedDateTo = new Date(dateTo);
	normalizedDateTo.setUTCHours(23, 59, 59, 999);

	try {
		const statistics = await getTransactionCountsPerCategory({
			userId: session.user.id,
			dateFrom: normalizedDateFrom,
			dateTo: normalizedDateTo,
			type,
		});
		return respondWithJSON(200, statistics);
	} catch (err) {
		return respondWithError(500, "Error getting statistics", err);
	}

}
