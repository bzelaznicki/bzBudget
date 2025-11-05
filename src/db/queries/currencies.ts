import { currencies } from "../schema";
import { db } from "../db";

export interface CurrencyResponse {
	id: string;
	name: string;
	isoCode: string;
	symbol: string;
}

export async function listCurrencies(): Promise<CurrencyResponse[]> {
	const records = await db
		.select({
			id: currencies.id,
			name: currencies.name,
			isoCode: currencies.isoCode,
			symbol: currencies.symbol,
		})
		.from(currencies)
		.orderBy(currencies.name);

	return records;
}
