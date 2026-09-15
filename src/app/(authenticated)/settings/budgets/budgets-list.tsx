"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";

import type { BudgetWithSpending } from "@/db/queries/budgets";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/warm-ledger/confirm-dialog";
import {
	BudgetStateLabel,
	FieldLabel,
	Panel,
	ProgressRing,
	SegmentedControl,
	budgetState,
	budgetStateColor,
} from "@/components/warm-ledger/primitives";
import { type CurrencyFormat, formatMoney } from "@/lib/format";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

type BudgetsListProps = {
	budgets: BudgetWithSpending[];
	currency: CurrencyFormat;
};

type BudgetPeriod = "weekly" | "monthly" | "yearly";

type BudgetUpdates = {
	amount?: number;
	alertThreshold?: number;
	emailAlerts?: boolean;
	period?: string;
};

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string }[] = [
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
	{ value: "yearly", label: "Yearly" },
];

export function BudgetsList({ budgets: initialBudgets, currency }: BudgetsListProps) {
	const router = useRouter();
	const [budgets, setBudgets] = React.useState<BudgetWithSpending[]>(initialBudgets);
	const [pendingDeletions, setPendingDeletions] = React.useState<Set<string>>(() => new Set());
	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
	const [editSheetOpen, setEditSheetOpen] = React.useState(false);
	const [budgetPendingDelete, setBudgetPendingDelete] = React.useState<BudgetWithSpending | null>(
		null,
	);
	const [budgetPendingEdit, setBudgetPendingEdit] = React.useState<BudgetWithSpending | null>(null);

	React.useEffect(() => {
		setBudgets(initialBudgets);
	}, [initialBudgets]);

	const markPendingDeletion = React.useCallback((budgetId: string, isPending: boolean) => {
		setPendingDeletions((prev) => {
			const next = new Set(prev);
			if (isPending) {
				next.add(budgetId);
			} else {
				next.delete(budgetId);
			}
			return next;
		});
	}, []);

	const deleteBudget = React.useCallback(
		async (budgetId: string): Promise<boolean> => {
			markPendingDeletion(budgetId, true);

			try {
				const res = await fetch(`/api/budgets/${budgetId}`, {
					method: "DELETE",
				});

				if (!res.ok) {
					let errorMessage = "Failed to delete budget.";
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

				setBudgets((prev) => prev.filter((budget) => budget.id !== budgetId));
				toast.success("Budget deleted.");
				router.refresh();
				return true;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to delete budget. Please try again.";
				toast.error(message);
				return false;
			} finally {
				markPendingDeletion(budgetId, false);
			}
		},
		[markPendingDeletion, router],
	);

	const updateBudget = React.useCallback(
		async (budgetId: string, updates: BudgetUpdates): Promise<boolean> => {
			try {
				const res = await fetch(`/api/budgets/${budgetId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(updates),
				});

				if (!res.ok) {
					let errorMessage = "Failed to update budget.";
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

				// API returns BudgetResponse without computed fields
				// Refresh to get updated data with spending calculations
				toast.success("Budget updated.");
				router.refresh();
				return true;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to update budget. Please try again.";
				toast.error(message);
				return false;
			}
		},
		[router],
	);

	const handleDeleteDialogOpenChange = React.useCallback((open: boolean) => {
		setDeleteDialogOpen(open);
		if (!open) {
			setBudgetPendingDelete(null);
		}
	}, []);

	const handleEditSheetOpenChange = React.useCallback((open: boolean) => {
		setEditSheetOpen(open);
		if (!open) {
			setBudgetPendingEdit(null);
		}
	}, []);

	const openDeleteDialog = React.useCallback((budget: BudgetWithSpending) => {
		setBudgetPendingDelete(budget);
		setDeleteDialogOpen(true);
	}, []);

	const openEditSheet = React.useCallback((budget: BudgetWithSpending) => {
		setBudgetPendingEdit(budget);
		setEditSheetOpen(true);
	}, []);

	const handleConfirmDelete = React.useCallback(async () => {
		if (!budgetPendingDelete) return;
		const budget = budgetPendingDelete;
		setDeleteDialogOpen(false);
		setBudgetPendingDelete(null);
		const succeeded = await deleteBudget(budget.id);
		if (!succeeded) {
			setBudgetPendingDelete(budget);
			setDeleteDialogOpen(true);
		}
	}, [budgetPendingDelete, deleteBudget]);

	const handleConfirmEdit = React.useCallback(
		async (updates: BudgetUpdates) => {
			if (!budgetPendingEdit) return;
			const budget = budgetPendingEdit;
			const succeeded = await updateBudget(budget.id, updates);
			if (succeeded) {
				setEditSheetOpen(false);
				setBudgetPendingEdit(null);
			}
		},
		[budgetPendingEdit, updateBudget],
	);

	const budgetPendingDeleteIsDeleting = budgetPendingDelete
		? pendingDeletions.has(budgetPendingDelete.id)
		: false;

	const formatCurrency = (amount: number) => formatMoney(amount, currency);

	return (
		<>
			{budgets.length === 0 ? (
				<div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
					No budgets yet. Create one to start tracking a spending limit.
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{budgets.map((budget) => {
						const isDeleting = pendingDeletions.has(budget.id);
						const displayName = budget.category?.name ?? "Overall";
						const percentage = budget.utilizationPercentage;
						const state = budgetState(budget);
						const limit = Number(budget.amount);
						const remaining = limit - budget.currentSpending;

						return (
							<Panel
								key={budget.id}
								className={`group flex items-center gap-4 px-5 py-4.5 ${isDeleting ? "opacity-50" : ""}`}
							>
								<ProgressRing
									percentage={percentage}
									size={66}
									strokeWidth={9}
									color={budgetStateColor(state)}
									className="flex-none"
								/>

								<div className="min-w-0 flex-1">
									<div className="flex items-baseline justify-between gap-2">
										<span className="truncate text-sm font-semibold">{displayName}</span>
										<span className="text-numeric flex-none text-[13px]">
											{percentage.toFixed(0)}%
										</span>
									</div>
									<div className="text-muted-foreground mt-0.5 text-[12.5px]">
										{formatCurrency(budget.currentSpending)} of {formatCurrency(limit)}
										<span className="capitalize"> · {budget.period}</span>
									</div>
									<div className="mt-1.5">
										<BudgetStateLabel
											state={state}
											detail={
												remaining >= 0
													? `${formatCurrency(remaining)} left`
													: `${formatCurrency(Math.abs(remaining))} over`
											}
										/>
									</div>
								</div>

								<div className="flex flex-none flex-col gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100">
									<Button
										variant="ghost"
										size="icon"
										className="text-muted-foreground hover:text-foreground size-7"
										onClick={() => openEditSheet(budget)}
										disabled={isDeleting}
										type="button"
										aria-label={`Edit ${displayName} budget`}
									>
										<IconEdit className="size-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="text-muted-foreground hover:text-destructive size-7"
										onClick={() => openDeleteDialog(budget)}
										disabled={isDeleting}
										type="button"
										aria-label={`Delete ${displayName} budget`}
									>
										<IconTrash className="size-4" />
									</Button>
								</div>
							</Panel>
						);
					})}
				</div>
			)}

			<ConfirmDialog
				open={deleteDialogOpen}
				onOpenChange={handleDeleteDialogOpenChange}
				icon={<IconTrash />}
				title={`Delete the “${budgetPendingDelete?.category?.name ?? "Overall"}” budget?`}
				description="Your transactions stay exactly as they are — only the limit and its alerts go. This can't be undone."
				cancelLabel="Keep it"
				confirmLabel="Delete budget"
				pendingLabel="Deleting…"
				pending={budgetPendingDeleteIsDeleting}
				onConfirm={handleConfirmDelete}
			/>

			<Sheet open={editSheetOpen} onOpenChange={handleEditSheetOpenChange}>
				<SheetContent className="w-full gap-5 border-l px-7 py-6.5 shadow-[-24px_0_48px_-24px_rgba(27,25,23,0.4)] sm:max-w-[440px]">
					{budgetPendingEdit && (
						<EditBudgetForm
							key={budgetPendingEdit.id}
							budget={budgetPendingEdit}
							currency={currency}
							onSubmit={handleConfirmEdit}
							onDelete={() => {
								const budget = budgetPendingEdit;
								handleEditSheetOpenChange(false);
								openDeleteDialog(budget);
							}}
						/>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}

function EditBudgetForm({
	budget,
	currency,
	onSubmit,
	onDelete,
}: {
	budget: BudgetWithSpending;
	currency: CurrencyFormat;
	onSubmit: (updates: BudgetUpdates) => Promise<void>;
	onDelete: () => void;
}) {
	const [amount, setAmount] = React.useState(budget.amount);
	const [alertThreshold, setAlertThreshold] = React.useState(budget.alertThreshold);
	const [emailAlerts, setEmailAlerts] = React.useState(budget.emailAlerts);
	const [period, setPeriod] = React.useState<BudgetPeriod>(budget.period);
	const [saving, setSaving] = React.useState(false);

	const numericAmount = Number(amount);
	const isAmountValid = amount.trim() !== "" && Number.isFinite(numericAmount) && numericAmount > 0;
	const state = budgetState(budget);
	const displayName = budget.category?.name ?? "Overall";

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!isAmountValid || saving) return;
		setSaving(true);
		try {
			await onSubmit({ amount: numericAmount, alertThreshold, emailAlerts, period });
		} finally {
			setSaving(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex min-h-full flex-col gap-5">
			<SheetHeader className="p-0">
				<span className="text-eyebrow">Edit budget</span>
				<div className="mt-3 flex items-center gap-3.5">
					<ProgressRing
						percentage={budget.utilizationPercentage}
						size={52}
						strokeWidth={9}
						color={budgetStateColor(state)}
						className="flex-none"
					/>
					<div className="min-w-0 flex-1">
						<SheetTitle className="truncate text-[17px]">{displayName}</SheetTitle>
						<SheetDescription className="text-[12.5px]">
							{formatMoney(budget.currentSpending, currency)} spent this{" "}
							{budget.period.replace(/ly$/, "")}
						</SheetDescription>
					</div>
				</div>
			</SheetHeader>

			<div className="bg-sunk/40 border-border rounded-2xl border px-5 py-4.5 focus-within:border-[var(--income)]">
				<FieldLabel htmlFor="edit-amount" className="text-eyebrow block">
					Limit
				</FieldLabel>
				<input
					id="edit-amount"
					type="text"
					inputMode="decimal"
					autoComplete="off"
					value={amount}
					onChange={(event) => setAmount(event.target.value)}
					aria-invalid={!isAmountValid}
					className="text-money mt-1 w-full bg-transparent text-[46px] caret-[var(--income)] outline-none"
				/>
				{!isAmountValid ? (
					<p className="text-destructive text-[12px]">Enter an amount greater than 0.</p>
				) : null}
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
					<FieldLabel htmlFor="edit-threshold">Warn me at</FieldLabel>
					<span className="text-numeric text-[13px]">{alertThreshold}%</span>
				</div>
				<Slider
					id="edit-threshold"
					min={1}
					max={100}
					step={1}
					value={[alertThreshold]}
					onValueChange={(value: number[]) => setAlertThreshold(value[0])}
				/>
			</div>

			<div className="flex items-center gap-3">
				<div className="flex-1 leading-snug">
					<FieldLabel htmlFor="edit-email-alerts" className="text-foreground block text-[13.5px]">
						Email alerts
					</FieldLabel>
					<div className="text-muted-foreground text-[11.5px]">
						We&apos;ll write when spending reaches {alertThreshold}% of the limit
					</div>
				</div>
				<Switch id="edit-email-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
			</div>

			<div className="mt-auto flex gap-2.5">
				<Button
					type="submit"
					className="h-10 flex-1 rounded-[11px]"
					disabled={!isAmountValid || saving}
				>
					{saving ? "Saving…" : "Save changes"}
				</Button>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="border-destructive/35 text-destructive hover:bg-destructive/5 hover:text-destructive size-10 rounded-[11px]"
					onClick={onDelete}
					disabled={saving}
					aria-label={`Delete ${displayName} budget`}
				>
					<IconTrash className="size-4" />
				</Button>
			</div>
		</form>
	);
}
