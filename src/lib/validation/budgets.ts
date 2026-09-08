import { z } from "zod";

export const createBudgetPayloadSchema = z.object({
	amount: z.number().finite().positive(),
	period: z.enum(["weekly", "monthly", "yearly"]),
	alertThreshold: z.number().int().min(1).max(100),
	emailAlerts: z.boolean().default(true),
	categoriesId: z.string().uuid().nullable().default(null),
});
