"use client";

import * as React from "react";
import {
	IconArrowsLeftRight,
	IconBuildingBank,
	IconCalendar,
	IconNote,
	IconPencil,
	IconRepeat,
	IconTag,
	IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { FormAlert } from "@/components/auth/auth-fields";
import { Monogram, budgetState, budgetStateColor } from "@/components/warm-ledger/primitives";
import type { BudgetWithSpending } from "@/db/queries/budgets";
import type { TransactionResponse } from "@/db/queries/transactions";
import { type CurrencyFormat, formatMoney, monogram } from "@/lib/format";
import { cn } from "@/lib/utils";

const HEADING_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	weekday: "long",
	day: "numeric",
	month: "long",
	hour: "2-digit",
	minute: "2-digit",
});

export type DetailTransaction = TransactionResponse & { bookedAtDate: Date };

/**
 * Transaction detail from the 3a spec: a right sheet over the ledger with the amount in
 * serif, editable detail rows, this month's budget for the category, and the actions.
 */
export function TransactionDetailSheet({
	transaction,
	accountName,
	categories,
	primaryCurrency,
	open,
	onOpenChange,
	onSaved,
	onDelete,
}: {
	transaction: DetailTransaction | null;
	accountName?: string;
	categories: { id: string; name: string }[];
	/** Currency budgets are tracked in; the budget card only shows for matching transactions. */
	primaryCurrency: CurrencyFormat;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: (transaction: TransactionResponse) => void;
	onDelete: (transaction: DetailTransaction) => void;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full gap-5 overflow-y-auto border-l px-7 py-6.5 shadow-[-24px_0_48px_-24px_rgba(27,25,23,0.4)] sm:max-w-[440px]">
				{transaction ? (
					<DetailForm
						key={`${transaction.id}-${String(transaction.updatedAt)}`}
						transaction={transaction}
						accountName={accountName}
						categories={categories}
						primaryCurrency={primaryCurrency}
						onSaved={onSaved}
						onDelete={onDelete}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function DetailForm({
	transaction,
	accountName,
	categories,
	primaryCurrency,
	onSaved,
	onDelete,
}: {
	transaction: DetailTransaction;
	accountName?: string;
	categories: { id: string; name: string }[];
	primaryCurrency: CurrencyFormat;
	onSaved: (transaction: TransactionResponse) => void;
	onDelete: (transaction: DetailTransaction) => void;
}) {
	const isTransfer = transaction.transferId !== null;
	const magnitude = Math.abs(Number(transaction.amount));
	const signed = transaction.type === "incoming" ? magnitude : -magnitude;

	const initial = React.useMemo(
		() => ({
			counterparty: transaction.counterparty,
			categoriesId: transaction.categoriesId ?? "",
			description: transaction.description ?? "",
			bookedAt: toDateTimeLocal(transaction.bookedAtDate),
			recurring: transaction.recurring,
		}),
		[transaction],
	);
	const [values, setValues] = React.useState(initial);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const budget = useCategoryBudget(
		transaction,
		isTransfer || transaction.currency.isoCode !== primaryCurrency.isoCode,
	);

	const changed = (Object.keys(initial) as (keyof typeof initial)[]).filter(
		(key) => values[key] !== initial[key],
	);
	const merchantValid = values.counterparty.trim().length > 0;

	function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
		setValues((current) => ({ ...current, [key]: value }));
	}

	async function save(next = values) {
		const fields = (Object.keys(initial) as (keyof typeof initial)[]).filter(
			(key) => next[key] !== initial[key],
		);
		if (fields.length === 0 || saving) return;
		if (!next.counterparty.trim()) {
			setError("Merchant can't be empty.");
			return;
		}

		const bookedAt = new Date(next.bookedAt);
		if (Number.isNaN(bookedAt.getTime())) {
			setError("Pick a valid date and time.");
			return;
		}

		const body: Record<string, unknown> = {};
		for (const key of fields) {
			if (key === "categoriesId") body.categoriesId = next.categoriesId || null;
			else if (key === "description") body.description = next.description.trim() || null;
			else if (key === "counterparty") body.counterparty = next.counterparty.trim();
			else if (key === "bookedAt") body.bookedAt = bookedAt.toISOString();
			else body.recurring = next.recurring;
		}

		setSaving(true);
		setError(null);
		try {
			const response = await fetch(`/api/transactions/${transaction.id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error ?? "We couldn't save your changes.");
			toast.success("Transaction updated.");
			onSaved(payload as TransactionResponse);
		} catch (err) {
			setError(err instanceof Error ? err.message : "We couldn't save your changes.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex min-h-full flex-col gap-5">
			<SheetHeader className="gap-4 p-0">
				<span className="text-eyebrow">{isTransfer ? "Transfer" : "Transaction"}</span>
				<div className="flex items-center gap-3.5">
					{isTransfer ? (
						<span className="bg-sunk text-muted-foreground flex size-13 flex-none items-center justify-center rounded-2xl">
							<IconArrowsLeftRight className="size-5.5" />
						</span>
					) : (
						<Monogram
							label={monogram(values.counterparty || transaction.counterparty)}
							className="size-13 rounded-2xl text-[15px]"
						/>
					)}
					<div className="min-w-0 flex-1">
						<SheetTitle className="truncate text-[17px]">{transaction.counterparty}</SheetTitle>
						<SheetDescription className="text-[12.5px]">
							{HEADING_FORMATTER.format(transaction.bookedAtDate)}
						</SheetDescription>
					</div>
				</div>
			</SheetHeader>

			<div className={cn("text-money text-[46px]", signed > 0 && "text-income-foreground")}>
				{formatMoney(signed, transaction.currency, { signed: true })}
			</div>

			{error ? <FormAlert>{error}</FormAlert> : null}

			<div className="bg-border border-border flex flex-col gap-px overflow-hidden rounded-[14px] border">
				{isTransfer ? null : (
					<DetailRow label="Merchant" htmlFor="detail-merchant" icon={<IconPencil />}>
						<input
							id="detail-merchant"
							value={values.counterparty}
							maxLength={200}
							onChange={(event) => set("counterparty", event.target.value)}
							aria-invalid={!merchantValid}
							className="w-full bg-transparent outline-none"
						/>
					</DetailRow>
				)}
				{isTransfer ? null : (
					<DetailRow label="Category" htmlFor="detail-category" icon={<IconTag />}>
						<select
							id="detail-category"
							value={values.categoriesId}
							onChange={(event) => set("categoriesId", event.target.value)}
							className="w-full appearance-none bg-transparent outline-none"
						>
							<option value="">Uncategorised</option>
							{categories.map((category) => (
								<option key={category.id} value={category.id}>
									{category.name}
								</option>
							))}
						</select>
					</DetailRow>
				)}
				<DetailRow label="Account" icon={<IconBuildingBank />}>
					<span className="truncate">{accountName ?? "—"}</span>
				</DetailRow>
				<DetailRow label="Date" htmlFor="detail-date" icon={<IconCalendar />}>
					<input
						id="detail-date"
						type="datetime-local"
						value={values.bookedAt}
						onChange={(event) => set("bookedAt", event.target.value)}
						className="w-full bg-transparent outline-none [&::-webkit-calendar-picker-indicator]:hidden"
					/>
				</DetailRow>
				<DetailRow label="Note" htmlFor="detail-note" icon={<IconNote />}>
					<input
						id="detail-note"
						value={values.description}
						maxLength={500}
						placeholder="Add a note"
						onChange={(event) => set("description", event.target.value)}
						className="placeholder:text-muted-foreground w-full bg-transparent outline-none"
					/>
				</DetailRow>
			</div>

			{isTransfer ? (
				<p className="bg-sunk/40 border-border text-secondary-foreground rounded-[14px] border px-4 py-3.5 text-[12.5px] leading-relaxed">
					A move between your own accounts — it doesn&apos;t count towards budgets. Changing the
					date or note, or deleting it, applies to both sides.
				</p>
			) : budget ? (
				<BudgetImpact budget={budget} transaction={transaction} currency={primaryCurrency} />
			) : null}

			<div className="mt-auto flex gap-2.5">
				{isTransfer ? null : (
					<Button
						type="button"
						variant="outline"
						aria-pressed={values.recurring}
						className={cn(
							"h-10 flex-1 rounded-[11px]",
							values.recurring && "bg-sunk border-transparent",
						)}
						disabled={saving}
						onClick={() => {
							const next = { ...values, recurring: !values.recurring };
							setValues(next);
							// Saves straight away when it is the only change, like a toggle.
							if (changed.length === 0) void save(next);
						}}
					>
						<IconRepeat />
						{values.recurring ? "Recurring" : "Mark recurring"}
					</Button>
				)}
				<Button
					type="button"
					className="h-10 flex-1 rounded-[11px]"
					disabled={changed.length === 0 || saving || !merchantValid}
					onClick={() => void save()}
				>
					{saving ? "Saving…" : "Save"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="border-destructive/35 text-destructive hover:bg-destructive/5 hover:text-destructive size-10 rounded-[11px]"
					onClick={() => onDelete(transaction)}
					disabled={saving}
					aria-label={isTransfer ? "Delete transfer" : `Delete ${transaction.counterparty}`}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
		</div>
	);
}

function DetailRow({
	label,
	htmlFor,
	icon,
	children,
}: {
	label: string;
	htmlFor?: string;
	icon: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="bg-card focus-within:bg-sunk/30 flex items-center gap-3 px-4 py-3.5">
			<label htmlFor={htmlFor} className="text-muted-foreground w-24 flex-none text-[12.5px]">
				{label}
			</label>
			<div className="min-w-0 flex-1 text-[13.5px]">{children}</div>
			<span className="text-muted-foreground flex-none [&_svg]:size-[15px]" aria-hidden>
				{icon}
			</span>
		</div>
	);
}

/** The monthly budget that tracks this transaction's category, if one exists. */
function useCategoryBudget(transaction: DetailTransaction, excluded: boolean) {
	const [budget, setBudget] = React.useState<BudgetWithSpending | null>(null);
	const categoryId = transaction.categoriesId;
	const eligible = !excluded && transaction.type === "outgoing" && categoryId !== null;

	React.useEffect(() => {
		if (!eligible) return;
		const controller = new AbortController();
		fetch("/api/budgets", { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : []))
			.then((budgets: BudgetWithSpending[]) => {
				setBudget(
					budgets.find((item) => item.period === "monthly" && item.category?.id === categoryId) ??
						null,
				);
			})
			.catch(() => {
				// The card is extra context; the sheet works without it.
			});
		return () => controller.abort();
	}, [eligible, categoryId]);

	return eligible ? budget : null;
}

function BudgetImpact({
	budget,
	transaction,
	currency,
}: {
	budget: BudgetWithSpending;
	transaction: DetailTransaction;
	currency: CurrencyFormat;
}) {
	const limit = Number(budget.amount);
	const spent = budget.currentSpending;
	const percentage = Math.min(Math.max(budget.utilizationPercentage, 0), 100);
	const color = budgetStateColor(budgetState(budget));
	const amount = Math.abs(Number(transaction.amount));
	const now = new Date();
	const thisMonth =
		transaction.bookedAtDate.getFullYear() === now.getFullYear() &&
		transaction.bookedAtDate.getMonth() === now.getMonth();
	const leftBefore = limit - (spent - amount);

	return (
		<div className="bg-sunk/40 border-border rounded-[14px] border p-4">
			<div className="mb-2 text-[12.5px] font-semibold">{budget.category?.name} this month</div>
			<div className="text-muted-foreground flex items-baseline justify-between text-[12.5px]">
				<span>
					{formatMoney(spent, currency, { decimals: false })} of{" "}
					{formatMoney(limit, currency, { decimals: false })}
				</span>
				<span className="text-numeric">{budget.utilizationPercentage.toFixed(0)}%</span>
			</div>
			<span className="bg-sunk mt-2 block h-2 overflow-hidden rounded-full">
				<span
					className="block h-full rounded-full"
					style={{ width: `${percentage}%`, background: color }}
				/>
			</span>
			{thisMonth ? (
				<div className="text-muted-foreground mt-2 text-[11.5px]">
					{leftBefore > 0
						? `This purchase used ${Math.min((amount / leftBefore) * 100, 100).toFixed(0)}% of what was left.`
						: "The budget was already used up before this purchase."}
				</div>
			) : null}
		</div>
	);
}

function toDateTimeLocal(date: Date) {
	const pad = (value: number) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
		date.getHours(),
	)}:${pad(date.getMinutes())}`;
}
