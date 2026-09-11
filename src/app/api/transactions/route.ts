import {
	transactionFiltersSchema,
	transactionQueryFilters,
} from "@/lib/validation/transaction-filters";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import {
	countUserTransactions,
	createTransaction,
	getUserTransactions,
} from "@/db/queries/transactions";
import { checkBudgetsAndSendAlerts } from "@/db/queries/budgets";
import { auth } from "@/lib/auth";
import { transactionPayloadSchema, type TransactionPayload } from "@/lib/validation/transactions";
import {
	captureServerEvent,
	createServerPosthog,
	shutdownServerPosthog,
} from "@/lib/posthog-server";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function POST(req: Request) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const posthog = createServerPosthog();

	try {
		const json = await req.json();
		const parsed = transactionPayloadSchema.safeParse(json);

		if (!parsed.success) {
			const message = parsed.error.issues[0]?.message ?? "Invalid transaction payload";
			await captureServerEvent(posthog, "transaction_create_validation_failed", session.user.id, {
				message,
			});
			return respondWithError(400, message);
		}

		const payload: TransactionPayload = parsed.data;

		const bookedDate = new Date(payload.bookedAt);
		if (Number.isNaN(bookedDate.getTime())) {
			await captureServerEvent(posthog, "transaction_create_invalid_date", session.user.id, {
				bookedAt: payload.bookedAt,
			});
			return respondWithError(400, "Booked date is invalid");
		}

		const counterparty = payload.counterparty.trim();
		if (!counterparty) {
			await captureServerEvent(
				posthog,
				"transaction_create_missing_counterparty",
				session.user.id,
				{
					accountsId: payload.accountsId,
				},
			);
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
			await captureServerEvent(posthog, "transaction_create_failed", session.user.id, {
				accountsId: payload.accountsId,
			});
			return respondWithError(500, "Transaction could not be created");
		}

		await captureServerEvent(posthog, "transaction_created_server", session.user.id, {
			transactionId: transaction.id,
			accountsId: transaction.accountsId,
			amount: Number(transaction.amount),
			type: transaction.type,
			hasCategory: Boolean(transaction.categoriesId),
		});

		// Check budgets and send alerts in the background (don't block response)
		if (transaction.type === "outgoing") {
			void checkBudgetsAndSendAlerts(session.user.id).catch((err) => {
				console.error("Error checking budgets after transaction creation:", err);
			});
		}

		return respondWithJSON(201, transaction);
	} catch (err) {
		await captureServerEvent(posthog, "transaction_create_error", session.user.id, {
			error: err instanceof Error ? err.message : String(err),
		});
		return respondWithError(500, "Error creating transaction", err);
	} finally {
		await shutdownServerPosthog(posthog);
	}
}

export async function GET(req: NextRequest) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) return respondWithError(401, "Unauthorized");

	const parsed = transactionFiltersSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
	if (!parsed.success)
		return respondWithError(400, parsed.error.issues[0]?.message ?? "Invalid filters");
	const { page, perPage } = parsed.data;
	const filters = { usersId: session.user.id, ...transactionQueryFilters(parsed.data) };
	const limit = perPage;
	const offset = limit * (page - 1);

	try {
		const transactions = await getUserTransactions({
			...filters,
			limit,
			offset,
		});

		const totalCount = await countUserTransactions(filters);

		const pages = Math.ceil(totalCount / perPage);
		const res = {
			total: totalCount,
			pages,
			transactions,
		};
		return respondWithJSON(200, res);
	} catch (err) {
		return respondWithError(500, "Error getting transactions", err);
	}
}
