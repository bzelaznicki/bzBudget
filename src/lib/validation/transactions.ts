import { z } from "zod"

export const transactionFormSchema = z.object({
	accountsId: z.string().uuid({ message: "Select an account" }),
	amount: z
		.string()
		.min(1, "Enter an amount")
		.refine((value) => !Number.isNaN(Number(value)), "Amount must be a number"),
	counterparty: z.string().min(1, "Counterparty is required"),
	currenciesId: z.string().uuid({ message: "Select a currency" }),
	type: z.enum(["incoming", "outgoing"], {
		errorMap: () => ({ message: "Select a transaction type" }),
	}),
	bookedAt: z
		.string()
		.min(1, "Booked date is required")
		.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
	description: z.string().max(500, "Description is too long").optional(),
	categoriesId: z.string().uuid().optional(),
})

export type TransactionFormValues = z.infer<typeof transactionFormSchema>

export const transactionPayloadSchema = z.object({
	accountsId: z.string().uuid(),
	amount: z.number().finite(),
	counterparty: z.string().min(1),
	currenciesId: z.string().uuid(),
	type: z.enum(["incoming", "outgoing"]),
	bookedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
	description: z.string().optional(),
	categoriesId: z.string().uuid().optional(),
})

export type TransactionPayload = z.infer<typeof transactionPayloadSchema>
