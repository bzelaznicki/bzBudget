import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { createGoalSchema, updateGoalSchema } from "@/lib/validation/goals";
import { createGoal, deleteGoal, getUserGoal, listUserGoals, updateGoal } from "@/db/queries/goals";

async function main() {
	const client = postgres(process.env.DATABASE_URL!, { max: 1 });
	const ownerId = randomUUID();
	const otherId = randomUUID();
	const currencyId = randomUUID();
	try {
		await client`INSERT INTO users (id, email) VALUES (${ownerId}, ${`${ownerId}@example.invalid`}), (${otherId}, ${`${otherId}@example.invalid`})`;
		await client`INSERT INTO currencies (id, name, iso_code, symbol) VALUES (${currencyId}, ${currencyId}, 'TST', 'T')`;
		const input = createGoalSchema.parse({
			name: " Emergency fund ",
			targetAmount: "1000.50",
			currenciesId: currencyId,
		});
		assert.equal(input.name, "Emergency fund");
		assert.equal(input.currentAmount, "0.00");
		assert.equal(input.dueDate, null);
		for (const amount of [
			"",
			" ",
			"NaN",
			"Infinity",
			"-1",
			"1e3",
			"0x10",
			"1.001",
			"10000000000",
			"1,000",
			10,
			null,
		]) {
			assert.equal(
				createGoalSchema.safeParse({ ...input, targetAmount: amount }).success,
				false,
				`Reject target ${amount}`,
			);
			assert.equal(
				updateGoalSchema.safeParse({ currentAmount: amount }).success,
				false,
				`Reject saved ${amount}`,
			);
		}
		for (const patch of [
			{},
			{ targetAmount: "0" },
			{ name: " " },
			{ status: "unknown" },
			{ dueDate: "2026-02-30" },
			{ dueDate: "today" },
			{ dueDate: "0000-01-01" },
			{ usersId: otherId },
			{ description: "x".repeat(501) },
		]) {
			assert.equal(updateGoalSchema.safeParse(patch).success, false);
		}
		assert.equal(createGoalSchema.safeParse({ ...input, dueDate: "2028-02-29" }).success, true);
		assert.equal(
			createGoalSchema.parse({ ...input, targetAmount: "9999999999.99" }).targetAmount,
			"9999999999.99",
		);
		await assert.rejects(createGoal(ownerId, { ...input, currenciesId: randomUUID() }), {
			name: "InvalidGoalCurrencyError",
		});
		const goal = await createGoal(ownerId, input);
		assert.equal(goal.currentAmount, "0.00");
		assert.equal((await listUserGoals(ownerId)).length, 1);
		assert.deepEqual(await listUserGoals(otherId), []);
		assert.equal(await getUserGoal(otherId, goal.id), null);
		assert.equal(await updateGoal(otherId, goal.id, { currentAmount: "99.00" }), null);
		assert.equal(await deleteGoal(otherId, goal.id), false);
		assert.equal((await getUserGoal(ownerId, goal.id))?.currentAmount, "0.00");
		await assert.rejects(updateGoal(ownerId, goal.id, { currenciesId: randomUUID() }), {
			name: "InvalidGoalCurrencyError",
		});
		const updated = await updateGoal(
			ownerId,
			goal.id,
			updateGoalSchema.parse({
				currentAmount: "1100.25",
				dueDate: "2028-02-29",
				description: "Already saved",
				status: "completed",
			}),
		);
		assert.equal(updated?.currentAmount, "1100.25");
		assert.equal(updated?.targetAmount, "1000.50");
		assert.equal(updated?.dueDate, "2028-02-29");
		assert.equal((await listUserGoals(ownerId, "completed")).length, 1);
		assert.deepEqual(await listUserGoals(ownerId, "active"), []);
		assert.equal(
			(await updateGoal(ownerId, goal.id, { dueDate: null, description: null }))?.dueDate,
			null,
		);
		for (const status of ["active", "paused", "missed", "completed"] as const) {
			assert.equal((await updateGoal(ownerId, goal.id, { status }))?.status, status);
		}
		await assert.rejects(client`UPDATE goals SET target_amount = 0 WHERE id = ${goal.id}`, {
			code: "23514",
		});
		await assert.rejects(client`UPDATE goals SET current_amount = -1 WHERE id = ${goal.id}`, {
			code: "23514",
		});
		await assert.rejects(client`UPDATE goals SET target_amount = 'NaN' WHERE id = ${goal.id}`, {
			code: "23514",
		});
		await assert.rejects(
			client`DELETE FROM currencies WHERE id = ${currencyId}`,
			(error: unknown) =>
				error instanceof Error &&
				"code" in error &&
				["23503", "23001"].includes(String(error.code)),
		);
		assert.equal(await deleteGoal(ownerId, goal.id), true);
		assert.equal(await deleteGoal(ownerId, goal.id), false);
		assert.equal(await getUserGoal(ownerId, goal.id), null);
		assert.equal(await updateGoal(ownerId, goal.id, { status: "active" }), null);
		assert.deepEqual(await listUserGoals(ownerId), []);
		const [stored] = await client`SELECT deleted_at FROM goals WHERE id = ${goal.id}`;
		assert.ok(stored.deleted_at);
		console.log(
			"Goals validation, exact amounts, ownership, status filters, updates, and soft deletion pass.",
		);
	} finally {
		await client`DELETE FROM users WHERE id IN (${ownerId}, ${otherId})`;
		await client`DELETE FROM currencies WHERE id = ${currencyId}`;
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
