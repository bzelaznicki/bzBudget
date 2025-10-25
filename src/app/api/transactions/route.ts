import { headers } from "next/headers";

import { createTransaction } from "@/db/queries/transactions";
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
			const message = parsed.error.errors[0]?.message ?? "Invalid transaction payload";
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
	} catch (error) {
		return respondWithError(500, "Error creating transaction", error);
	}
}
