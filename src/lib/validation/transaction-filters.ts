import { z } from "zod";

const calendarDate = z.iso.date().refine((value) => !value.startsWith("0000"), "Invalid date");

export const transactionFiltersSchema = z
	.object({
		search: z.string().trim().max(200).optional(),
		categoryId: z.uuid().optional(),
		accountId: z.uuid().optional(),
		dateFrom: calendarDate.optional(),
		dateTo: calendarDate.optional(),
		page: z.coerce.number().int().min(1).max(1000000).default(1),
		perPage: z.coerce.number().int().min(1).max(100).default(20),
	})
	.refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, {
		message: "Start date must be on or before end date",
		path: ["dateTo"],
	});

export function transactionQueryFilters(value: z.infer<typeof transactionFiltersSchema>) {
	return {
		search: value.search,
		categoryId: value.categoryId,
		accountId: value.accountId,
		dateFrom: value.dateFrom ? new Date(`${value.dateFrom}T00:00:00.000Z`) : undefined,
		// End dates include the whole UTC day, including sub-millisecond timestamps.
		dateBefore: value.dateTo
			? new Date(new Date(`${value.dateTo}T00:00:00.000Z`).getTime() + 86400000)
			: undefined,
	};
}
