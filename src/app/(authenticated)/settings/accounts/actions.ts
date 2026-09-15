"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { createBankAccount } from "@/db/queries/accounts";
import { auth } from "@/lib/auth";
import { ACCOUNT_NAME_MAX_LENGTH } from "@/lib/validation/accounts";

export type CreateAccountState = { status: "idle" | "error" | "created"; message?: string };

export async function createAccountAction(
	_previous: CreateAccountState,
	formData: FormData,
): Promise<CreateAccountState> {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) {
		return { status: "error", message: "Your session ended. Sign in again to add an account." };
	}

	const name = formData.get("name");
	const currencyId = formData.get("currencyId");
	const iban = formData.get("iban");

	const safeName = typeof name === "string" ? name.trim() : "";
	const safeCurrencyId = typeof currencyId === "string" ? currencyId.trim() : "";
	const safeIban = typeof iban === "string" && iban.trim().length > 0 ? iban.trim() : undefined;

	if (!safeName) {
		return { status: "error", message: "Give the account a name." };
	}
	if (safeName.length > ACCOUNT_NAME_MAX_LENGTH) {
		return {
			status: "error",
			message: `Keep the name under ${ACCOUNT_NAME_MAX_LENGTH} characters.`,
		};
	}
	if (!safeCurrencyId) {
		return { status: "error", message: "Pick the currency this account holds." };
	}

	try {
		await createBankAccount(session.user.id, safeName, safeCurrencyId, safeIban);
	} catch {
		return { status: "error", message: "We couldn't save the account. Please try again." };
	}

	revalidatePath("/settings/accounts");
	return { status: "created" };
}
