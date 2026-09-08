import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createBudgetPayloadSchema } from "@/lib/validation/budgets";
import { createBudget } from "@/db/queries/budgets";

async function main() {
	const client = postgres(process.env.DATABASE_URL!, { max: 1 });
	try {
		const [owner, other] = await client`
				INSERT INTO users (email)
				VALUES ('owner@example.invalid'), ('other@example.invalid')
				RETURNING id
			`;
		const [foreign] = await client`
				INSERT INTO categories (name,type,users_id)
				VALUES ('Private category','user',${other.id})
				RETURNING id
			`;
		const input = {
			usersId: owner.id,
			categoriesId: foreign.id,
			amount: 100,
			period: "monthly" as const,
			alertThreshold: 80,
			emailAlerts: true,
		};
		await assert.rejects(createBudget(input), { name: "InvalidBudgetCategoryError" });
		const [count] =
			await client`SELECT count(*)::int AS count FROM budgets WHERE users_id = ${owner.id}`;
		assert.equal(count.count, 0);
		await assert.rejects(createBudget({ ...input, categoriesId: randomUUID() }), {
			name: "InvalidBudgetCategoryError",
		});
		const [orphan] = await client`
				INSERT INTO categories (name,type,users_id)
				VALUES ('Orphan','user',null)
				RETURNING id
			`;
		await assert.rejects(createBudget({ ...input, categoriesId: orphan.id }), {
			name: "InvalidBudgetCategoryError",
		});
		const [system, owned] = await client`
				INSERT INTO categories (name,type,users_id)
				VALUES ('System','system',null), ('Owned','user',${owner.id})
				RETURNING id
			`;
		for (const categoriesId of [system.id, owned.id, null]) {
			const budget = await createBudget({ ...input, categoriesId });
			assert.ok(budget);
			assert.equal(budget.category?.id ?? null, categoriesId);
		}
		const payload = { amount: 100, period: "monthly", alertThreshold: 80 };
		assert.deepEqual(createBudgetPayloadSchema.parse(payload), {
			...payload,
			emailAlerts: true,
			categoriesId: null,
		});
		for (const invalid of [
			null,
			[],
			{ ...payload, amount: Infinity },
			{ ...payload, amount: 0 },
			{ ...payload, amount: "100" },
			{ ...payload, period: "daily" },
			{ ...payload, alertThreshold: 1.5 },
			{ ...payload, alertThreshold: 101 },
			{ ...payload, emailAlerts: "false" },
			{ ...payload, emailAlerts: null },
			{ ...payload, categoriesId: 42 },
			{ ...payload, categoriesId: "" },
			{ ...payload, categoriesId: {} },
		]) {
			assert.equal(createBudgetPayloadSchema.safeParse(invalid).success, false);
		}
		assert.equal(
			createBudgetPayloadSchema.parse({ ...payload, emailAlerts: false }).emailAlerts,
			false,
		);
		console.log(
			"Budget creation rejects foreign and missing categories; system, owned, and overall budgets succeed.",
		);
	} finally {
		await client.end();
	}
}
main().then(
	() => process.exit(0),
	(error) => {
		console.error(error);
		process.exit(1);
	},
);
