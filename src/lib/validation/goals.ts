import { z } from "zod";
import { normalizeAmountInput } from "./currencies";

export const goalsFormSchema = z.object({
	currentAmount: z.string().min(1, "Enter an amount").transform((value) => normalizeAmountInput(value)).refine((value) => value.length > 0, "Enter an amount")
		.refine((value) => !Number.isNaN(Number(value)), "Amount must be a number")
		.refine((value) => Number(value) >= 0, "Amount cannot be negative"),
	targetAmount: z.string().min(1, "Enter an amount").transform((value) => normalizeAmountInput(value)).refine((value) => value.length > 0, "Enter an amount")
		.refine((value) => !Number.isNaN(Number(value)), "Amount must be a number")
		.refine((value) => Number(value) >= 0, "Amount cannot be negative"),
	name: z.string().min(1, "Name is required"),
	goalType: z.enum(["saving", "spending"]),
	status: z.enum(["active", "completed", "missed", "paused"]),
	goalPeriod: z.enum(["one-time", "monthly", "weekly", "yearly"]),
	startDate: z.date(),
	endDate: z.date(),
	categoriesId: z.string().uuid().optional(),
	description: z.string().max(500, "Description too long").optional(),


});

export type GoalsFormTypes = z.infer<typeof goalsFormSchema>; 
