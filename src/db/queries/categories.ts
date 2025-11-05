import { asc, eq, isNull, or } from "drizzle-orm";

import { db } from "../db";
import { categories } from "../schema";

export interface CategoryResponse {
	id: string;
	name: string;
	type: "system" | "user";
}

export async function listUserCategories(usersId: string): Promise<CategoryResponse[]> {
	const records = await db
		.select({
			id: categories.id,
			name: categories.name,
			type: categories.type,
		})
		.from(categories)
		.where(or(isNull(categories.usersId), eq(categories.usersId, usersId)))
		.orderBy(asc(categories.name));

	return records;
}
