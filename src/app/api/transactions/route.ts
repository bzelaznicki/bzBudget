import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { countUserTransactions, createTransaction, getUserTransactions } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { transactionPayloadSchema, type TransactionPayload } from "@/lib/validation/transactions";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	try {
		const json = await req.json();
		const parsed = transactionPayloadSchema.safeParse(json);

		if (!parsed.success) {
			const message = parsed.error.issues[0]?.message ?? "Invalid transaction payload";
			return respondWithError(400, message);
		}

		const payload: TransactionPayload = parsed.data;

		const bookedDate = new Date(payload.bookedAt);
		if (Number.isNaN(bookedDate.getTime())) {
			return respondWithError(400, "Booked date is invalid");
		}

		const counterparty = payload.counterparty.trim();
		if (!counterparty) {
			return respondWithError(400, "Counterparty is required");
		}

		const description = payload.description?.trim();
		const normalizedDescription = description && description.length > 0 ? description : undefined;

		const transaction = await createTransaction(
			session.user.id,
			payload.accountsId,
			payload.amount,
			counterparty,
			payload.currenciesId,
			bookedDate,
			payload.type,
			normalizedDescription,
			payload.categoriesId,
		);

		if (!transaction) {
			return respondWithError(500, "Transaction could not be created");
		}

		return respondWithJSON(201, transaction);
	} catch (err) {
		return respondWithError(500, "Error creating transaction", err);
	}
}

export async function GET(req: NextRequest) {

	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const queryParams = req.nextUrl.searchParams;
	const page = queryParams.get("page") ?? "1";
	const perPage = queryParams.get("perPage");

	let pageInt = parseInt(page);
	if (isNaN(pageInt)) return respondWithError(400, "Page must be a number");
	if (pageInt < 1) pageInt = 1;

	let perPageInt = parseInt(perPage ?? "10");
	if (isNaN(perPageInt)) return respondWithError(400, "Number per page must be a number");

	if (perPageInt >= 100) perPageInt = 100;
	if (perPageInt < 1) perPageInt = 1;
	const limit = perPageInt;
	const offset = limit * (pageInt - 1);

	try {
		const transactions = await getUserTransactions({
			usersId: session.user.id,
			limit,
			offset,
		});

		const totalCount = await countUserTransactions({
			usersId: session.user.id,
		});

		const pages = Math.ceil(totalCount / perPageInt);
		const res = {
			total: totalCount,
			pages,
			transactions,
		}
		return respondWithJSON(200, res);
	} catch (err) {
		return respondWithError(500, "Error getting transactions", err);
	}
}
