"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import type { CategoryResponse } from "@/db/queries/categories";
import { FormAlert } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { FieldLabel, SegmentedControl } from "@/components/warm-ledger/primitives";
import { parseTransactionAmount } from "@/lib/validation/transactions";

type BudgetPeriod = "weekly" | "monthly" | "yearly";

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

/** "New budget" — the create form lives in a right sheet, as in the 2b spec. */
export function NewBudgetSheet({ categories }: { categories: CategoryResponse[] }) {
	const [open, setOpen] = React.useState(false);
	const [formKey, setFormKey] = React.useState(0);

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setFormKey((key) => key + 1);
			}}
		>
			<SheetTrigger asChild>
				<Button size="sm" className="h-8 gap-1.5 rounded-[9px] text-[13px]">
					<IconPlus className="size-4" />
					New budget
				</Button>
			</SheetTrigger>
			<SheetContent className="w-full gap-5 overflow-y-auto border-l px-7 py-6.5 shadow-[-24px_0_48px_-24px_rgba(27,25,23,0.4)] sm:max-w-[440px]">
				<CreateBudgetForm key={formKey} categories={categories} onCreated={() => setOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}

function CreateBudgetForm({
	categories,
	onCreated,
}: {
	categories: CategoryResponse[];
	onCreated: () => void;
}) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [amount, setAmount] = React.useState("");
	const [period, setPeriod] = React.useState<BudgetPeriod>("monthly");
	const [categoryId, setCategoryId] = React.useState<string>("overall");
	const [alertThreshold, setAlertThreshold] = React.useState(80);
	const [emailAlerts, setEmailAlerts] = React.useState(true);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		let numAmount: number;
		try {
			numAmount = parseTransactionAmount(amount);
		} catch {
			numAmount = Number.NaN;
		}
		if (Number.isNaN(numAmount) || numAmount <= 0) {
			setError("Enter a limit greater than 0.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const res = await fetch("/api/budgets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: numAmount,
					period,
					alertThreshold,
					emailAlerts,
					categoriesId: categoryId === "overall" ? null : categoryId,
				}),
			});

			if (!res.ok) {
				let errorMessage = "Failed to create budget";
				try {
					const data = await res.json();
					if (data && typeof data === "object" && "error" in data) {
						const message = (data as { error?: unknown }).error;
						if (typeof message === "string" && message.trim().length > 0) {
							errorMessage = message;
						}
					}
				} catch {
					// ignore JSON parsing errors
				}
				throw new Error(errorMessage);
			}

			toast.success("Budget created.");
			onCreated();
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create budget");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5">
			<SheetHeader className="p-0">
				<span className="text-eyebrow">New budget</span>
				<SheetTitle className="mt-2 text-[17px]">Set a limit</SheetTitle>
				<SheetDescription className="text-[12.5px]">
					For one category or all your spending, and choose when to be warned.
				</SheetDescription>
			</SheetHeader>

			{error ? <FormAlert>{error}</FormAlert> : null}

			<div className="grid gap-1.5">
				<FieldLabel htmlFor="budget-category">Category</FieldLabel>
				<select
					id="budget-category"
					value={categoryId}
					onChange={(event) => setCategoryId(event.target.value)}
					className="border-input bg-card focus-visible:ring-ring/50 h-11 w-full rounded-[11px] border px-3 text-sm outline-none focus-visible:ring-[3px]"
				>
					<option value="overall">Overall — all spending</option>
					{categories.map((category) => (
						<option key={category.id} value={category.id}>
							{category.name}
						</option>
					))}
				</select>
			</div>

			<div className="bg-sunk/40 border-border rounded-2xl border px-5 py-4.5 focus-within:border-[var(--income)]">
				<FieldLabel htmlFor="budget-amount" className="text-eyebrow block">
					Limit
				</FieldLabel>
				<input
					id="budget-amount"
					type="text"
					inputMode="decimal"
					autoComplete="off"
					placeholder="0.00"
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					required
					className="text-money placeholder:text-muted-foreground/50 mt-1 w-full bg-transparent text-[46px] caret-[var(--income)] outline-none"
				/>
			</div>

			<div className="grid gap-2">
				<span className="text-secondary-foreground text-[12.5px]">Resets</span>
				<SegmentedControl
					label="Period"
					value={period}
					onChange={setPeriod}
					options={PERIOD_OPTIONS}
				/>
			</div>

			<div className="grid gap-3">
				<div className="flex items-baseline justify-between">
					<FieldLabel htmlFor="budget-threshold">Warn me at</FieldLabel>
					<span className="text-numeric text-[13px]">{alertThreshold}%</span>
				</div>
				<Slider
					id="budget-threshold"
					min={1}
					max={100}
					step={1}
					value={[alertThreshold]}
					onValueChange={(value: number[]) => setAlertThreshold(value[0])}
				/>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex-1 leading-snug">
					<FieldLabel htmlFor="budget-email-alerts" className="text-foreground block text-[13.5px]">
						Email alerts
					</FieldLabel>
					<div className="text-muted-foreground text-[11.5px]">
						We&apos;ll write when spending reaches {alertThreshold}% of the limit
					</div>
				</div>
				<Switch id="budget-email-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
			</div>

			<Button type="submit" className="mt-auto h-11 rounded-xl" disabled={isSubmitting}>
				{isSubmitting ? "Creating…" : "Create budget"}
			</Button>
		</form>
	);
}
