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
import { Switch } from "@/components/ui/switch";
import { Monogram, SegmentedControl } from "@/components/warm-ledger/primitives";
import { monogram } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
	parseTransactionAmount,
	transactionFormSchema,
	type TransactionFormValues,
} from "@/lib/validation/transactions";
import { captureClientEvent } from "@/instrumentation-client";

type TransactionMetaResponse = {
	accounts: BankAccountResponse[];
	currencies: CurrencyResponse[];
	categories: CategoryResponse[];
};

const LABEL_CLASS = "text-secondary-foreground text-[12.5px] font-normal";
const FIELD_CLASS = "h-[42px] w-full min-w-0 rounded-[11px]";

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
	// Set by "Save & add another" so a successful submit keeps the dialog open.
	const addAnother = React.useRef(false);

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
			const keepOpen = addAnother.current;
			addAnother.current = false;

			let amountNumber: number;
			try {
				amountNumber = parseTransactionAmount(values.amount);
			} catch {
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
				recurring: values.recurring,
			};

			captureClientEvent("transaction_create_submitted", {
				...payload,
				descriptionLength: normalizedDescription?.length ?? 0,
			});

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

				captureClientEvent("transaction_create_succeeded", {
					transactionId: transaction.id,
					accountsId: transaction.accountsId,
					currency: transaction.currency.isoCode,
					hasCategory: Boolean(transaction.categoriesId),
					type: transaction.type,
				});

				if (keepOpen) {
					// Keep the account, currency, type and date: a batch of entries usually shares them.
					form.reset({
						...buildDefaultValues(meta),
						accountsId: values.accountsId,
						currenciesId: values.currenciesId,
						type: values.type,
						bookedAt: values.bookedAt,
					});
					form.setFocus("amount");
				} else {
					form.reset(buildDefaultValues(meta));
					onOpenChange(false);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : "Unable to create transaction";
				toast.error(message);
				captureClientEvent("transaction_create_failed", {
					error: message,
					accountsId: values.accountsId,
					categoriesId: values.categoriesId,
					type: values.type,
				});
			}
		},
		[form, meta, onOpenChange, onTransactionCreated],
	);

	const categories = meta?.categories ?? [];
	const accounts = meta?.accounts ?? [];
	const currencies = meta?.currencies ?? [];
	const submitDisabled = isSubmitting || accounts.length === 0 || currencies.length === 0;
	const showAccountHint = accounts.length === 0 && !metaLoading;

	const selectedAccount = accounts.find((item) => item.id === form.watch("accountsId"));
	const selectedCurrency = currencies.find((item) => item.id === form.watch("currenciesId"));
	const counterparty = form.watch("counterparty");
	const amountContext = [selectedCurrency?.isoCode, selectedAccount?.name]
		.filter(Boolean)
		.join(" · ");

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
			<DialogContent className="gap-4.5">
				<DialogHeader>
					<DialogTitle className="text-base">New transaction</DialogTitle>
					<DialogDescription className="sr-only">
						Amount first — everything past the merchant is optional.
					</DialogDescription>
				</DialogHeader>
				{metaError ? (
					<div className="border-destructive/30 bg-destructive/5 flex flex-col items-start gap-3 rounded-xl border p-4 text-sm">
						<p className="text-destructive font-medium">{metaError}</p>
						<Button variant="outline" size="sm" onClick={handleRetry} disabled={metaLoading}>
							Try again
						</Button>
					</div>
				) : (
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit, () => {
								addAnother.current = false;
							})}
							className="grid min-w-0 gap-4.5"
						>
							{showAccountHint ? (
								<div className="bg-sunk/60 border-border text-secondary-foreground rounded-xl border px-3.5 py-3 text-[12.5px]">
									Add an account in settings before recording transactions.
								</div>
							) : null}

							<FormField
								control={form.control}
								name="type"
								render={({ field }) => (
									<FormItem>
										<SegmentedControl
											label="Direction"
											value={field.value}
											onChange={field.onChange}
											disabled={isSubmitting}
											options={[
												{ value: "outgoing", label: "Money out" },
												{ value: "incoming", label: "Money in" },
											]}
										/>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="amount"
								render={({ field }) => (
									<FormItem className="bg-sunk/40 border-border gap-1 rounded-2xl border px-5 py-4.5 focus-within:border-[var(--income)]">
										<FormLabel className="text-eyebrow font-normal">Amount</FormLabel>
										<div className="flex items-baseline gap-2">
											<FormControl>
												<input
													{...field}
													type="text"
													inputMode="decimal"
													placeholder="0.00"
													autoComplete="off"
													autoFocus
													disabled={isSubmitting}
													className="text-money placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-[46px] caret-[var(--income)] outline-none"
												/>
											</FormControl>
											{amountContext ? (
												<span className="text-muted-foreground flex-none text-[12.5px]">
													{amountContext}
												</span>
											) : null}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid min-w-0 gap-3">
								<FormField
									control={form.control}
									name="counterparty"
									render={({ field }) => (
										<FormItem className="min-w-0 gap-1.5">
											<FormLabel className={LABEL_CLASS}>Merchant</FormLabel>
											<div className="relative">
												{counterparty.trim() ? (
													<Monogram
														label={monogram(counterparty)}
														className="pointer-events-none absolute top-1/2 left-2 size-6.5 -translate-y-1/2 rounded-lg text-[10px]"
													/>
												) : null}
												<FormControl>
													<Input
														{...field}
														placeholder="e.g. Rewe"
														disabled={isSubmitting}
														className={cn(FIELD_CLASS, counterparty.trim() && "pl-11")}
													/>
												</FormControl>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>

								{categories.length > 0 ? (
									<FormField
										control={form.control}
										name="categoriesId"
										render={({ field }) => (
											<FormItem className="min-w-0 gap-1.5">
												<FormLabel className={LABEL_CLASS}>Category</FormLabel>
												<div
													role="radiogroup"
													aria-label="Category"
													className="flex max-h-[112px] flex-wrap gap-1.5 overflow-y-auto"
												>
													{categories.map((category) => {
														const selected = field.value === category.id;
														return (
															<button
																key={category.id}
																type="button"
																role="radio"
																aria-checked={selected}
																disabled={isSubmitting}
																// Clicking the chosen chip again clears it: category is optional.
																onClick={() => field.onChange(selected ? undefined : category.id)}
																className={cn(
																	"focus-visible:ring-ring/50 h-8 rounded-full border px-3.5 text-[12.5px] outline-none transition-colors focus-visible:ring-[3px]",
																	selected
																		? "bg-primary text-primary-foreground border-primary"
																		: "bg-card border-input text-secondary-foreground hover:bg-sunk",
																)}
															>
																{category.name}
															</button>
														);
													})}
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>
								) : null}

								<div className="grid min-w-0 gap-3 sm:grid-cols-[1.4fr_1fr]">
									<FormField
										control={form.control}
										name="accountsId"
										render={({ field }) => (
											<FormItem className="min-w-0 gap-1.5">
												<FormLabel className={LABEL_CLASS}>Account</FormLabel>
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
													<FormControl>
														<SelectTrigger
															className={cn(FIELD_CLASS, "w-full data-[size=default]:h-[42px]")}
														>
															<SelectValue
																placeholder={metaLoading ? "Loading…" : "Select account"}
															/>
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{accounts.map((account) => (
															<SelectItem key={account.id} value={account.id}>
																{account.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="currenciesId"
										render={({ field }) => (
											<FormItem className="min-w-0 gap-1.5">
												<FormLabel className={LABEL_CLASS}>Currency</FormLabel>
												<Select
													value={field.value}
													onValueChange={field.onChange}
													disabled={metaLoading || currencies.length === 0 || isSubmitting}
												>
													<FormControl>
														<SelectTrigger
															className={cn(FIELD_CLASS, "w-full data-[size=default]:h-[42px]")}
														>
															<SelectValue placeholder={metaLoading ? "Loading…" : "Select"} />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{currencies.map((currency) => (
															<SelectItem key={currency.id} value={currency.id}>
																{currency.isoCode} — {currency.symbol}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<div className="grid min-w-0 gap-3 sm:grid-cols-2">
									<FormField
										control={form.control}
										name="bookedAt"
										render={({ field }) => (
											<FormItem className="min-w-0 gap-1.5">
												<FormLabel className={LABEL_CLASS}>Date</FormLabel>
												<FormControl>
													<Input
														{...field}
														type="datetime-local"
														disabled={isSubmitting}
														className={FIELD_CLASS}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem className="min-w-0 gap-1.5">
												<FormLabel className={LABEL_CLASS}>Note</FormLabel>
												<FormControl>
													<Input
														{...field}
														placeholder="Optional"
														disabled={isSubmitting}
														className={FIELD_CLASS}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</div>

							<FormField
								control={form.control}
								name="recurring"
								render={({ field }) => (
									<FormItem className="flex items-center gap-3">
										<div className="flex-1 leading-snug">
											<FormLabel className="text-[13.5px] font-normal">
												Repeats every month
											</FormLabel>
											<p className="text-muted-foreground text-[11.5px]">
												Marked with a repeat icon in your ledger
											</p>
										</div>
										<FormControl>
											<Switch
												checked={field.value}
												onCheckedChange={field.onChange}
												disabled={isSubmitting}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							<div className="flex flex-col-reverse gap-2.5 sm:flex-row">
								<Button
									type="submit"
									variant="outline"
									className="h-11 flex-1 rounded-xl"
									disabled={submitDisabled}
									onClick={() => {
										addAnother.current = true;
									}}
								>
									Save &amp; add another
								</Button>
								<Button
									type="submit"
									className="h-11 flex-1 rounded-xl"
									disabled={submitDisabled}
									onClick={() => {
										addAnother.current = false;
									}}
								>
									{isSubmitting ? "Saving…" : "Save transaction"}
								</Button>
							</div>
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
		recurring: false,
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
