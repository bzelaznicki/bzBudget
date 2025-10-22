import { headers } from "next/headers"

import { getUserBankAccounts } from "@/db/queries/accounts"
import { listUserCategories } from "@/db/queries/categories"
import { listCurrencies } from "@/db/queries/currencies"
import { auth } from "@/lib/auth"
import { respondWithError, respondWithJSON } from "@/util/json"

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() })

	if (!session) {
		return respondWithError(401, "Unauthorized")
	}

	try {
		const [accounts, currencies, categories] = await Promise.all([
			getUserBankAccounts(session.user.id, 100, 0),
			listCurrencies(),
			listUserCategories(session.user.id),
		])

		return respondWithJSON(200, {
			accounts: accounts ?? [],
			currencies,
			categories,
		})
	} catch (error) {
		return respondWithError(500, "Failed to load transaction metadata", error)
	}
}
