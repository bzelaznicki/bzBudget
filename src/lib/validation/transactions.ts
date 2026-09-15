import { z } from "zod";

const normalizeAmountInput = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return "";

	let normalized = trimmed.replace(/\s+/g, "");
	const hasComma = normalized.includes(",");
	const hasDot = normalized.includes(".");

	if (hasComma && hasDot) {
		if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
			normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
		} else {
			normalized = normalized.replace(/,/g, "");
		}
	} else if (hasComma) {
		normalized = normalized.replace(/,/g, ".");
	}

	return normalized;
};

export const parseTransactionAmount = (value: string) => {
	const normalized = normalizeAmountInput(value);
	if (!normalized) {
		throw new Error("Invalid amount");
	}
	const parsed = Number(normalized);

	if (!Number.isFinite(parsed)) {
		throw new Error("Invalid amount");
	}

	return parsed;
};

export const transactionFormSchema = z.object({
	accountsId: z.string().uuid({ message: "Select an account" }),
	amount: z
		.string()
		.min(1, "Enter an amount")
		.transform((value) => normalizeAmountInput(value))
		.refine((value) => value.length > 0, "Enter an amount")
		.refine((value) => !Number.isNaN(Number(value)), "Amount must be a number")
		.refine((value) => Number(value) >= 0, "Amount cannot be negative"),
	counterparty: z.string().min(1, "Counterparty is required"),
	currenciesId: z.string().uuid({ message: "Select a currency" }),
	type: z.enum(["incoming", "outgoing"], {
		error: "Select a transaction type",
	}),
	bookedAt: z
		.string()
		.min(1, "Booked date is required")
		.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
	description: z.string().max(500, "Description is too long").optional(),
	categoriesId: z.string().uuid().optional(),
	recurring: z.boolean(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/** Fields the detail sheet can change. Amount, account and direction stay as booked. */
export const transactionUpdateSchema = z
	.object({
		counterparty: z.string().trim().min(1, "Merchant is required").max(200).optional(),
		categoriesId: z.string().uuid().nullable().optional(),
		description: z.string().trim().max(500, "Note is too long").nullable().optional(),
		bookedAt: z
			.string()
			.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
			.optional(),
		recurring: z.boolean().optional(),
	})
	.strict()
	.refine((value) => Object.keys(value).length > 0, "Nothing to update");

export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;

export const transferPayloadSchema = z
	.object({
		fromAccountId: z.string().uuid({ message: "Choose the account to move from" }),
		toAccountId: z.string().uuid({ message: "Choose the account to move to" }),
		amount: z
			.number()
			.finite()
			.positive("Amount must be more than 0")
			.max(9999999999.99)
			.refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
				message: "Amount can have at most two decimal places",
			}),
		bookedAt: z
			.string()
			.refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
			.optional(),
		description: z.string().trim().max(500, "Note is too long").optional(),
	})
	.refine((value) => value.fromAccountId !== value.toAccountId, {
		message: "Pick two different accounts",
		path: ["toAccountId"],
	});

export type TransferPayload = z.infer<typeof transferPayloadSchema>;

export const transactionPayloadSchema = z.object({
	accountsId: z.string().uuid(),
	amount: z.number().finite(),
	counterparty: z.string().min(1),
	currenciesId: z.string().uuid(),
	type: z.enum(["incoming", "outgoing"]),
	bookedAt: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
	description: z.string().optional(),
	categoriesId: z.string().uuid().optional(),
	recurring: z.boolean().optional(),
});

export type TransactionPayload = z.infer<typeof transactionPayloadSchema>;
