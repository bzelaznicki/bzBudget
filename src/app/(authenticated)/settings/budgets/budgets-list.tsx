"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";

import type { BudgetWithSpending } from "@/db/queries/budgets";
import { Button } from "@/components/ui/button";
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
};

export function BudgetsList({ budgets: initialBudgets }: BudgetsListProps) {
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

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(amount);
	};

	const getProgressColor = (percentage: number) => {
		if (percentage >= 100) return "bg-red-500";
		if (percentage >= 80) return "bg-amber-500";
		return "bg-emerald-500";
	};

	return (
		<>
			{budgets.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
					No budgets yet. Use the form on the right to add your first budget.
				</div>
			) : (
				<div className="space-y-4">
					{budgets.map((budget) => {
						const isDeleting = pendingDeletions.has(budget.id);
						const displayName = budget.category?.name ?? "Overall";
						const percentage = Math.min(budget.utilizationPercentage, 100);

						return (
							<div
								key={budget.id}
								className="rounded-lg border border-gray-200 bg-white/90 p-4 shadow-sm"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<p className="text-sm font-medium text-gray-900">{displayName}</p>
											<span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 capitalize">
												{budget.period}
											</span>
											{budget.isOverBudget && (
												<span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
													Exceeded
												</span>
											)}
											{budget.isThresholdReached && !budget.isOverBudget && (
												<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-600">
													Alert
												</span>
											)}
										</div>
										<p className="mt-1 text-xs text-gray-500">
											{budget.emailAlerts ? "Email alerts on" : "Email alerts off"} •{" "}
											{budget.alertThreshold}% threshold
										</p>
									</div>
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-gray-500 hover:text-gray-700"
											onClick={() => openEditDialog(budget)}
											disabled={isDeleting}
											type="button"
											aria-label="Edit budget"
										>
											<IconEdit className={`size-4 ${isDeleting ? "opacity-50" : ""}`} />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-destructive hover:text-destructive focus-visible:text-destructive"
											onClick={() => openDeleteDialog(budget)}
											disabled={isDeleting}
											type="button"
											aria-label="Delete budget"
										>
											<IconTrash className={`size-4 ${isDeleting ? "opacity-50" : ""}`} />
										</Button>
									</div>
								</div>

								<div className="mt-4">
									<div className="flex items-center justify-between text-sm">
										<span className="text-gray-600">
											{formatCurrency(budget.currentSpending)} spent
										</span>
										<span className="text-gray-900 font-medium">
											{formatCurrency(Number(budget.amount))}
										</span>
									</div>
									<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
										<div
											className={`h-full ${getProgressColor(budget.utilizationPercentage)} transition-all duration-300`}
											style={{ width: `${percentage}%` }}
										/>
									</div>
									<div className="mt-1 text-right text-xs text-gray-500">
										{budget.utilizationPercentage.toFixed(1)}% used
									</div>
								</div>
							</div>
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
