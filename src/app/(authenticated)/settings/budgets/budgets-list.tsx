"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";

import type { BudgetWithSpending } from "@/db/queries/budgets";
import { Button } from "@/components/ui/button";
import {
	BudgetStateLabel,
	Panel,
	ProgressRing,
	budgetState,
	budgetStateColor,
} from "@/components/warm-ledger/primitives";
import { type CurrencyFormat, formatMoney } from "@/lib/format";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Dialog as EditDialog,
	DialogContent as EditDialogContent,
	DialogHeader as EditDialogHeader,
	DialogTitle as EditDialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type BudgetsListProps = {
	budgets: BudgetWithSpending[];
	currency: CurrencyFormat;
};

export function BudgetsList({ budgets: initialBudgets, currency }: BudgetsListProps) {
	const router = useRouter();
	const [budgets, setBudgets] = React.useState<BudgetWithSpending[]>(initialBudgets);
	const [pendingDeletions, setPendingDeletions] = React.useState<Set<string>>(() => new Set());
	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
	const [editDialogOpen, setEditDialogOpen] = React.useState(false);
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
		async (
			budgetId: string,
			updates: { amount?: number; alertThreshold?: number; emailAlerts?: boolean; period?: string },
		): Promise<boolean> => {
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

	const handleEditDialogOpenChange = React.useCallback((open: boolean) => {
		setEditDialogOpen(open);
		if (!open) {
			setBudgetPendingEdit(null);
		}
	}, []);

	const openDeleteDialog = React.useCallback((budget: BudgetWithSpending) => {
		setBudgetPendingDelete(budget);
		setDeleteDialogOpen(true);
	}, []);

	const openEditDialog = React.useCallback((budget: BudgetWithSpending) => {
		setBudgetPendingEdit(budget);
		setEditDialogOpen(true);
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
		async (updates: {
			amount?: number;
			alertThreshold?: number;
			emailAlerts?: boolean;
			period?: string;
		}) => {
			if (!budgetPendingEdit) return;
			const budget = budgetPendingEdit;
			const succeeded = await updateBudget(budget.id, updates);
			if (succeeded) {
				setEditDialogOpen(false);
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
										onClick={() => openEditDialog(budget)}
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

			<Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete budget</DialogTitle>
						<DialogDescription>
							{budgetPendingDelete
								? `Are you sure you want to delete the budget for "${budgetPendingDelete.category?.name ?? "Overall"}"? This action cannot be undone.`
								: "Are you sure you want to delete this budget? This action cannot be undone."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={budgetPendingDeleteIsDeleting}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmDelete}
							disabled={!budgetPendingDelete || budgetPendingDeleteIsDeleting}
						>
							{budgetPendingDeleteIsDeleting ? "Deleting..." : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<EditDialog open={editDialogOpen} onOpenChange={handleEditDialogOpenChange}>
				<EditDialogContent>
					<EditDialogHeader>
						<EditDialogTitle>Edit Budget</EditDialogTitle>
					</EditDialogHeader>
					{budgetPendingEdit && (
						<EditBudgetForm
							budget={budgetPendingEdit}
							onSubmit={handleConfirmEdit}
							onCancel={() => setEditDialogOpen(false)}
						/>
					)}
				</EditDialogContent>
			</EditDialog>
		</>
	);
}

function EditBudgetForm({
	budget,
	onSubmit,
	onCancel,
}: {
	budget: BudgetWithSpending;
	onSubmit: (updates: {
		amount?: number;
		alertThreshold?: number;
		emailAlerts?: boolean;
		period?: string;
	}) => void;
	onCancel: () => void;
}) {
	const [amount, setAmount] = React.useState(Number(budget.amount));
	const [alertThreshold, setAlertThreshold] = React.useState(budget.alertThreshold);
	const [emailAlerts, setEmailAlerts] = React.useState(budget.emailAlerts);
	const [period, setPeriod] = React.useState(budget.period);

	const isAmountValid = Number.isFinite(amount) && amount > 0;

	const handleSubmit = () => {
		if (!isAmountValid) {
			return;
		}
		onSubmit({
			amount,
			alertThreshold,
			emailAlerts,
			period,
		});
	};

	return (
		<div className="space-y-4 py-4">
			<div className="space-y-2">
				<Label htmlFor="edit-amount">Budget Amount</Label>
				<Input
					id="edit-amount"
					type="number"
					min="0.01"
					step="0.01"
					value={amount}
					onChange={(e) => setAmount(parseFloat(e.target.value))}
					className={!isAmountValid ? "border-red-500" : ""}
				/>
				{!isAmountValid && (
					<p className="text-xs text-red-500">Please enter a valid amount greater than 0</p>
				)}
			</div>

			<div className="space-y-2">
				<Label htmlFor="edit-period">Period</Label>
				<Select
					value={period}
					onValueChange={(value: "weekly" | "monthly" | "yearly") => setPeriod(value)}
				>
					<SelectTrigger id="edit-period">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="weekly">Weekly</SelectItem>
						<SelectItem value="monthly">Monthly</SelectItem>
						<SelectItem value="yearly">Yearly</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label htmlFor="edit-threshold">Alert Threshold ({alertThreshold}%)</Label>
				<Slider
					id="edit-threshold"
					min={1}
					max={100}
					step={1}
					value={[alertThreshold]}
					onValueChange={(value: number[]) => setAlertThreshold(value[0])}
				/>
			</div>

			<div className="flex items-center space-x-2">
				<Switch id="edit-email-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
				<Label htmlFor="edit-email-alerts">Enable email alerts</Label>
			</div>

			<div className="flex justify-end gap-2 pt-4">
				<Button variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} disabled={!isAmountValid}>
					Save Changes
				</Button>
			</div>
		</div>
	);
}
