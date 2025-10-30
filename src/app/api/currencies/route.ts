import { listCurrencies } from "@/db/queries/currencies";
import { respondWithError, respondWithJSON } from "@/util/json";

export async function GET() {
	try {
		const currencies = await listCurrencies();
		return respondWithJSON(200, currencies);
	} catch (error) {
		return respondWithError(500, "Failed to load currencies", error);
	}
}

