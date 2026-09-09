"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { listUserGoals } from "@/db/queries/goals";
import type { CurrencyResponse } from "@/db/queries/currencies";
import { createGoalSchema, goalStatusSchema } from "@/lib/validation/goals";

type Goal = Awaited<ReturnType<typeof listUserGoals>>[number];
const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const statuses = goalStatusSchema.options;

async function saveRequest(url: string, method: string, body?: unknown) {
	const response = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		...(body !== undefined ? { body: JSON.stringify(body) } : {}),
	});
	if (!response.ok) {
		const result = await response.json().catch(() => null);
		throw new Error(
			typeof result?.error === "string"
				? result.error
				: "Unable to save changes. Please try again.",
		);
	}
}

export function GoalsManager({
	goals,
	currencies,
	defaultCurrencyId,
	today,
}: {
	goals: Goal[];
	currencies: CurrencyResponse[];
	defaultCurrencyId?: string;
	today: string;
}) {
	const router = useRouter();
	const [filter, setFilter] = useState("all");
	const [editor, setEditor] = useState<Goal | "new" | null>(null);
	const [deleting, setDeleting] = useState<Goal | null>(null);
	const [busy, setBusy] = useState(false);
	const [deleteError, setDeleteError] = useState("");
	const visible = goals.filter((goal) => filter === "all" || goal.status === filter);

	async function confirmDelete() {
		if (!deleting || busy) return;
		setBusy(true);
		setDeleteError("");
		try {
			await saveRequest(`/api/goals/${deleting.id}`, "DELETE");
			setDeleting(null);
			toast.success("Goal deleted");
			router.refresh();
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : "Unable to delete goal");
		} finally {
			setBusy(false);
		}
	}

	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div className="space-y-2">
					<Label htmlFor="goal-status-filter">Show goals</Label>
					<select
						id="goal-status-filter"
						className={selectClass}
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
					>
						<option value="all">All statuses</option>
						{statuses.map((status) => (
							<option key={status} value={status}>
								{status[0].toUpperCase() + status.slice(1)}
							</option>
						))}
					</select>
				</div>
				<Button onClick={() => setEditor("new")} disabled={currencies.length === 0}>
					Add goal
				</Button>
			</div>
			{currencies.length === 0 && (
				<p role="status">No currencies are available. Add a currency before creating a goal.</p>
			)}
			{visible.length === 0 ? (
				<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
					{goals.length === 0
						? "No goals yet. Add your first savings goal to get started."
						: "No goals match this status."}
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{visible.map((goal) => {
						const currency = currencies.find((item) => item.id === goal.currenciesId);
						const money = (amount: string) => {
							const formattedAmount = Number(amount).toLocaleString("en", {
								minimumFractionDigits: 2,
								maximumFractionDigits: 2,
							});
							return `${formattedAmount} ${currency?.isoCode ?? ""}`;
						};
						const percent = (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100;
						const overdue = goal.status === "active" && goal.dueDate && goal.dueDate < today;
						return (
							<Card key={goal.id}>
								<CardHeader>
									<CardTitle className="break-words">{goal.name}</CardTitle>
									<div className="flex flex-wrap gap-2 text-sm">
										<span className="rounded-full bg-muted px-2 py-1 capitalize">
											{goal.status}
										</span>
										{overdue && (
											<span className="rounded-full bg-amber-100 px-2 py-1 text-amber-900">
												Past target date
											</span>
										)}
									</div>
								</CardHeader>
								<CardContent className="space-y-4">
									{goal.description && (
										<p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
											{goal.description}
										</p>
									)}
									<div>
										<p className="text-sm">
											{money(goal.currentAmount)} saved of {money(goal.targetAmount)}
										</p>
										<progress
											className="mt-2 h-3 w-full accent-[var(--income)]"
											aria-label={`${goal.name} progress`}
											max={100}
											value={Math.min(percent, 100)}
										/>
										<p className="text-sm text-muted-foreground">{percent.toFixed(1)}% saved</p>
									</div>
									<p className="text-sm text-muted-foreground">
										{goal.dueDate ? (
											<>
												Target date: <time dateTime={goal.dueDate}>{goal.dueDate}</time>
											</>
										) : (
											"No target date"
										)}
									</p>
									<div className="flex flex-wrap gap-2">
										<Button
											variant="outline"
											onClick={() => setEditor(goal)}
											aria-label={`Edit ${goal.name}`}
										>
											Edit / update progress
										</Button>
										<Button
											variant="ghost"
											onClick={() => {
												setDeleteError("");
												setDeleting(goal);
											}}
											aria-label={`Delete ${goal.name}`}
										>
											Delete
										</Button>
									</div>
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
			<Dialog
				open={editor !== null}
				onOpenChange={(open) => {
					if (!open && !busy) setEditor(null);
				}}
			>
				<DialogContent className="max-h-[90dvh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{editor === "new" ? "Add savings goal" : "Edit savings goal"}</DialogTitle>
						<DialogDescription>
							Enter your total saved so far. You choose when to mark a goal completed, paused, or
							missed.
						</DialogDescription>
					</DialogHeader>
					{editor !== null && (
						<GoalForm
							key={editor === "new" ? "new" : editor.id}
							goal={editor === "new" ? undefined : editor}
							currencies={currencies}
							defaultCurrencyId={defaultCurrencyId}
							busy={busy}
							setBusy={setBusy}
							onCancel={() => setEditor(null)}
							onSaved={() => {
								setEditor(null);
								router.refresh();
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
			<Dialog
				open={deleting !== null}
				onOpenChange={(open) => {
					if (!open && !busy) setDeleting(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete goal</DialogTitle>
						<DialogDescription>
							Delete &quot;{deleting?.name}&quot; from your goals? Your accounts and transactions
							will stay the same.
						</DialogDescription>
					</DialogHeader>
					{deleteError && (
						<p role="alert" className="text-sm text-destructive">
							{deleteError}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>
							Cancel
						</Button>
						<Button variant="destructive" disabled={busy} onClick={confirmDelete}>
							{busy ? "Deleting..." : "Delete goal"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

function GoalForm({
	goal,
	currencies,
	defaultCurrencyId,
	busy,
	setBusy,
	onCancel,
	onSaved,
}: {
	goal?: Goal;
	currencies: CurrencyResponse[];
	defaultCurrencyId?: string;
	busy: boolean;
	setBusy: (busy: boolean) => void;
	onCancel: () => void;
	onSaved: () => void;
}) {
	const id = useId();
	const [error, setError] = useState("");
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (busy) return;
		const values = Object.fromEntries(new FormData(event.currentTarget));
		const parsed = createGoalSchema.safeParse({
			...values,
			dueDate: values.dueDate || null,
			description: values.description || null,
		});
		if (!parsed.success) {
			setError(parsed.error.issues[0].message);
			return;
		}
		setBusy(true);
		setError("");
		try {
			await saveRequest(
				goal ? `/api/goals/${goal.id}` : "/api/goals",
				goal ? "PATCH" : "POST",
				parsed.data,
			);
			toast.success(goal ? "Goal updated" : "Goal created");
			onSaved();
		} catch (error) {
			setError(error instanceof Error ? error.message : "Unable to save goal");
		} finally {
			setBusy(false);
		}
	}
	return (
		<form onSubmit={submit} className="space-y-4">
			<fieldset disabled={busy} className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor={`${id}-name`}>Name</Label>
					<Input
						id={`${id}-name`}
						name="name"
						required
						maxLength={100}
						defaultValue={goal?.name}
						placeholder="Emergency fund"
					/>
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor={`${id}-target`}>Target amount</Label>
						<Input
							id={`${id}-target`}
							name="targetAmount"
							type="number"
							inputMode="decimal"
							required
							min="0.01"
							max="9999999999.99"
							step="0.01"
							defaultValue={goal?.targetAmount}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${id}-current`}>Saved so far</Label>
						<Input
							id={`${id}-current`}
							name="currentAmount"
							type="number"
							inputMode="decimal"
							required
							min="0"
							max="9999999999.99"
							step="0.01"
							defaultValue={goal?.currentAmount ?? "0.00"}
						/>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`${id}-currency`}>Currency</Label>
					<select
						id={`${id}-currency`}
						name="currenciesId"
						required
						className={selectClass}
						defaultValue={
							goal?.currenciesId ??
							(currencies.some((currency) => currency.id === defaultCurrencyId)
								? defaultCurrencyId
								: currencies[0]?.id)
						}
					>
						{currencies.map((currency) => (
							<option key={currency.id} value={currency.id}>
								{currency.isoCode} — {currency.name}
							</option>
						))}
					</select>
					{goal && (
						<p className="text-xs text-muted-foreground">
							If you change currency, enter the amounts in the new currency. Amounts are not
							converted automatically.
						</p>
					)}
				</div>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor={`${id}-due`}>Target date (optional)</Label>
						<Input
							id={`${id}-due`}
							name="dueDate"
							type="date"
							min="0001-01-01"
							max="9999-12-31"
							defaultValue={goal?.dueDate ?? ""}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${id}-status`}>Status</Label>
						<select
							id={`${id}-status`}
							name="status"
							className={selectClass}
							defaultValue={goal?.status ?? "active"}
						>
							{statuses.map((status) => (
								<option key={status} value={status}>
									{status[0].toUpperCase() + status.slice(1)}
								</option>
							))}
						</select>
					</div>
				</div>
				<div className="space-y-2">
					<Label htmlFor={`${id}-description`}>Notes (optional)</Label>
					<textarea
						id={`${id}-description`}
						name="description"
						maxLength={500}
						rows={3}
						className="w-full rounded-md border bg-background p-3 text-sm"
						defaultValue={goal?.description ?? ""}
					/>
				</div>
			</fieldset>
			{error && (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			)}
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={busy}>
					{busy ? "Saving..." : goal ? "Save changes" : "Create goal"}
				</Button>
			</div>
		</form>
	);
}
