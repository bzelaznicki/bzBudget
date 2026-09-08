import { z } from "zod";

// Keep money as decimal strings so API input has the same precision as PostgreSQL.
const amountSchema = z
	.string()
	.trim()
	.regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/, "Enter an amount with up to two decimal places")
	.transform((value) => {
		const [whole, fraction = ""] = value.split(".");
		return `${whole}.${fraction.padEnd(2, "0")}`;
	});

export const goalStatusSchema = z.enum(["active", "completed", "missed", "paused"]);

const goalFields = z
	.object({
		name: z.string().trim().min(1, "Enter a name").max(100, "Use at most 100 characters"),
		targetAmount: amountSchema.refine(
			(value) => Number(value) > 0,
			"Target must be greater than zero",
		),
		currentAmount: amountSchema,
		currenciesId: z.string().uuid("Select a currency"),
		status: goalStatusSchema,
		dueDate: z.iso
			.date()
			.refine((value) => value >= "0001-01-01", "Enter a valid target date")
			.nullable(),
		description: z.string().trim().max(500, "Use at most 500 characters").nullable(),
	})
	.strict();

export const createGoalSchema = goalFields.extend({
	currentAmount: goalFields.shape.currentAmount.default("0.00"),
	status: goalStatusSchema.default("active"),
	dueDate: goalFields.shape.dueDate.default(null),
	description: goalFields.shape.description.default(null),
});

export const updateGoalSchema = goalFields
	.partial()
	.refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

export const goalIdSchema = z.string().uuid();
export const goalListSchema = z
	.object({
		status: goalStatusSchema.optional(),
	})
	.strict();

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type GoalStatus = z.infer<typeof goalStatusSchema>;
