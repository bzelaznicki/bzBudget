"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { BankAccountResponse } from "@/db/queries/accounts";
import type { CategoryResponse } from "@/db/queries/categories";
import type { CurrencyResponse } from "@/db/queries/currencies";
import type { TransactionResponse } from "@/db/queries/transactions";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { transactionFormSchema, type TransactionFormValues } from "@/lib/validation/transactions";

type TransactionMetaResponse = {
	accounts: BankAccountResponse[];
	currencies: CurrencyResponse[];
	categories: CategoryResponse[];
};

const UNCATEGORIZED_SELECT_VALUE = "uncategorized";

export interface TransactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onTransactionCreated: (transaction: TransactionResponse) => void;
	trigger?: React.ReactNode;
}

export function TransactionDialog({
	open,
	onOpenChange,
	onTransactionCreated,
	trigger,
}: TransactionDialogProps) {
	const [meta, setMeta] = React.useState<TransactionMetaResponse | null>(null);
	const [metaLoading, setMetaLoading] = React.useState(false);
	const [metaError, setMetaError] = React.useState<string | null>(null);
	const fetchingMeta = React.useRef(false);

	const form = useForm<TransactionFormValues>({
		resolver: zodResolver(transactionFormSchema),
		defaultValues: buildDefaultValues(null),
	});

	const isSubmitting = form.formState.isSubmitting;

	const ensureMetaLoaded = React.useCallback(
		async (force = false) => {
			if (!force && (meta || fetchingMeta.current)) return;
			if (fetchingMeta.current) return;
			fetchingMeta.current = true;
			try {
				setMetaLoading(true);
				setMetaError(null);
				const response = await fetch("/api/transactions/meta");
				if (!response.ok) {
					const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
					throw new Error(errorBody?.error ?? "Unable to load form data");
				}
				const data = (await response.json()) as TransactionMetaResponse;
				setMeta(data);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unable to load form data";
				setMetaError(message);
			} finally {
				setMetaLoading(false);
				fetchingMeta.current = false;
			}
		},
		[meta],
	);

	React.useEffect(() => {
		if (open) {
			void ensureMetaLoaded();
			form.setValue("bookedAt", formatDateTimeLocal(new Date()), {
				shouldDirty: false,
			});
		}
	}, [open, ensureMetaLoaded, form]);

	React.useEffect(() => {
		if (!meta) return;
		const defaults = buildDefaultValues(meta);

		if (!form.getValues("accountsId") && defaults.accountsId) {
			form.setValue("accountsId", defaults.accountsId, { shouldDirty: false });
		}

		if (!form.getValues("currenciesId") && defaults.currenciesId) {
			form.setValue("currenciesId", defaults.currenciesId, { shouldDirty: false });
		}
	}, [meta, form]);

	React.useEffect(() => {
		if (!open) {
			form.reset(buildDefaultValues(meta));
		}
	}, [open, form, meta]);

	const handleRetry = React.useCallback(() => {
		setMeta(null);
		void ensureMetaLoaded(true);
	}, [ensureMetaLoaded]);

	const onSubmit = React.useCallback(
		async (values: TransactionFormValues) => {
			const amountNumber = Number(values.amount);
			if (Number.isNaN(amountNumber)) {
				toast.error("Amount must be a valid number");
				return;
			}

			const bookedDate = new Date(values.bookedAt);
			if (Number.isNaN(bookedDate.getTime())) {
				toast.error("Booked date is invalid");
				return;
			}

			const description = values.description?.trim();
			const normalizedDescription = description && description.length > 0 ? description : undefined;

			const payload = {
				accountsId: values.accountsId,
				amount: amountNumber,
				counterparty: values.counterparty.trim(),
				currenciesId: values.currenciesId,
				type: values.type,
				bookedAt: bookedDate.toISOString(),
				description: normalizedDescription,
				categoriesId: values.categoriesId,
			};

			try {
				const response = await fetch("/api/transactions", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});

				if (!response.ok) {
					const errorBody = (await response.json().catch(() => null)) as { error?: string } | null;
					throw new Error(errorBody?.error ?? "Unable to create transaction");
				}

				const transaction = (await response.json()) as TransactionResponse;
				onTransactionCreated(transaction);
				toast.success("Transaction added");

				form.reset(buildDefaultValues(meta));
				onOpenChange(false);
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unable to create transaction";
				toast.error(message);
			}
		},
		[form, meta, onOpenChange, onTransactionCreated],
	);

	const categories = meta?.categories ?? [];
	const accounts = meta?.accounts ?? [];
	const currencies = meta?.currencies ?? [];
	const submitDisabled = isSubmitting || accounts.length === 0 || currencies.length === 0;
	const showAccountHint = accounts.length === 0 && !metaLoading;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Add transaction</DialogTitle>
					<DialogDescription>
						Record a new transaction. Required fields are marked with an asterisk.
					</DialogDescription>
				</DialogHeader>
				{metaError ? (
					<div className="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
						<p className="font-medium text-destructive">{metaError}</p>
						<Button variant="outline" size="sm" onClick={handleRetry} disabled={metaLoading}>
							Try again
						</Button>
					</div>
				) : (
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
							{showAccountHint ? (
								<div className="rounded-md border border-muted-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground">
									Add an account in settings before recording transactions.
								</div>
							) : null}
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="accountsId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Account *</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={(value) => {
														field.onChange(value);
														const account = accounts.find((item) => item.id === value);
														if (account) {
															form.setValue("currenciesId", account.currenciesId, {
																shouldDirty: false,
															});
														}
													}}
													disabled={metaLoading || accounts.length === 0 || isSubmitting}
												>
													<SelectTrigger className="w-full">
														<SelectValue
															placeholder={metaLoading ? "Loading..." : "Select account"}
														/>
													</SelectTrigger>
													<SelectContent>
														{accounts.map((account) => (
															<SelectItem key={account.id} value={account.id}>
																{account.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="currenciesId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Currency *</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
													disabled={metaLoading || currencies.length === 0 || isSubmitting}
												>
													<SelectTrigger className="w-full">
														<SelectValue
															placeholder={metaLoading ? "Loading..." : "Select currency"}
														/>
													</SelectTrigger>
													<SelectContent>
														{currencies.map((currency) => (
															<SelectItem key={currency.id} value={currency.id}>
																{currency.symbol} {currency.isoCode}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="amount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Amount *</FormLabel>
											<FormControl>
												<Input
													{...field}
													type="number"
													step="0.01"
													min="0"
													inputMode="decimal"
													placeholder="0.00"
													disabled={isSubmitting}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="type"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Type *</FormLabel>
											<FormControl>
												<Select
													value={field.value}
													onValueChange={field.onChange}
													disabled={isSubmitting}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select type" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="incoming">Incoming</SelectItem>
														<SelectItem value="outgoing">Outgoing</SelectItem>
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<div className="grid gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="bookedAt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Booked at *</FormLabel>
											<FormControl>
												<Input {...field} type="datetime-local" disabled={isSubmitting} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="categoriesId"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Category</FormLabel>
											<FormControl>
												<Select
													value={field.value ?? UNCATEGORIZED_SELECT_VALUE}
													onValueChange={(value) => {
														if (value === UNCATEGORIZED_SELECT_VALUE) {
															field.onChange(undefined);
															return;
														}
														field.onChange(value);
													}}
													disabled={isSubmitting}
												>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="Select category" />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value={UNCATEGORIZED_SELECT_VALUE}>
															Uncategorized
														</SelectItem>
														{categories.map((category) => (
															<SelectItem key={category.id} value={category.id}>
																{category.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="counterparty"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Counterparty *</FormLabel>
										<FormControl>
											<Input {...field} placeholder="e.g. Grocery store" disabled={isSubmitting} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<textarea
												{...field}
												rows={3}
												placeholder="Optional notes"
												className="border-input focus-visible:ring-ring/50 dark:focus-visible:ring-ring/40 focus-visible:ring-offset-background placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 flex min-h-[6rem] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
												disabled={isSubmitting}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter className="gap-2 sm:justify-between">
								<Button
									type="button"
									variant="outline"
									onClick={() => onOpenChange(false)}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={submitDisabled}>
									{isSubmitting ? "Saving..." : "Save transaction"}
								</Button>
							</DialogFooter>
						</form>
					</Form>
				)}
			</DialogContent>
		</Dialog>
	);
}

function buildDefaultValues(meta: TransactionMetaResponse | null): TransactionFormValues {
	const now = formatDateTimeLocal(new Date());
	const defaultAccount = meta?.accounts.length === 1 ? meta.accounts[0] : undefined;
	const defaultCurrencyFromAccount = defaultAccount?.currenciesId;
	const defaultCurrency =
		defaultCurrencyFromAccount ?? (meta?.currencies.length === 1 ? meta.currencies[0].id : "");

	return {
		accountsId: defaultAccount ? defaultAccount.id : "",
		amount: "",
		counterparty: "",
		currenciesId: defaultCurrency ?? "",
		type: "outgoing",
		bookedAt: now,
		description: "",
		categoriesId: undefined,
	};
}

function formatDateTimeLocal(date: Date) {
	const pad = (value: number) => String(value).padStart(2, "0");
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1);
	const day = pad(date.getDate());
	const hours = pad(date.getHours());
	const minutes = pad(date.getMinutes());
	return `${year}-${month}-${day}T${hours}:${minutes}`;
}
