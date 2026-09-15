"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";
import { FormAlert } from "@/components/auth/auth-fields";
import { ConfirmDialog } from "@/components/warm-ledger/confirm-dialog";
import { FieldLabel, SegmentedControl } from "@/components/warm-ledger/primitives";
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
const fieldSelectClass =
	"border-input bg-card focus-visible:ring-ring/50 h-11 w-full rounded-[11px] border px-3 text-sm outline-none focus-visible:ring-[3px]";
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
				<DialogContent className="gap-4.5">
					<DialogHeader>
						<DialogTitle className="text-base">
							{editor === "new" ? "New savings goal" : "Edit savings goal"}
						</DialogTitle>
						<DialogDescription className="text-[12.5px]">
							Enter your total saved so far. You choose when a goal is completed, paused or missed.
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
			<ConfirmDialog
				open={deleting !== null}
				onOpenChange={(open) => !open && setDeleting(null)}
				icon={<IconTrash />}
				title={`Delete “${deleting?.name ?? ""}”?`}
				description="The goal and its progress go. Your accounts and transactions stay exactly as they are."
				cancelLabel="Keep it"
				confirmLabel="Delete goal"
				pendingLabel="Deleting…"
				pending={busy}
				error={deleteError}
				onConfirm={confirmDelete}
			/>
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
	const [status, setStatus] = useState<(typeof statuses)[number]>(goal?.status ?? "active");
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
		<form onSubmit={submit} className="grid gap-4.5">
			{error && <FormAlert>{error}</FormAlert>}
			<fieldset disabled={busy} className="grid gap-3.5">
				<div className="grid gap-1.5">
					<FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
					<Input
						id={`${id}-name`}
						name="name"
						required
						maxLength={100}
						defaultValue={goal?.name}
						placeholder="Emergency fund"
						className="h-11"
						autoFocus
					/>
				</div>
				<div className="bg-sunk/40 border-border grid gap-3 rounded-2xl border px-5 py-4 sm:grid-cols-2">
					<div className="grid gap-1">
						<FieldLabel htmlFor={`${id}-current`} className="text-eyebrow">
							Saved so far
						</FieldLabel>
						<input
							id={`${id}-current`}
							name="currentAmount"
							type="number"
							inputMode="decimal"
							required
							min="0"
							max="9999999999.99"
							step="0.01"
							defaultValue={goal?.currentAmount ?? "0.00"}
							className="text-money w-full bg-transparent text-[34px] caret-[var(--income)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
					<div className="grid gap-1">
						<FieldLabel htmlFor={`${id}-target`} className="text-eyebrow">
							Target
						</FieldLabel>
						<input
							id={`${id}-target`}
							name="targetAmount"
							type="number"
							inputMode="decimal"
							required
							min="0.01"
							max="9999999999.99"
							step="0.01"
							defaultValue={goal?.targetAmount}
							placeholder="0.00"
							className="text-money placeholder:text-muted-foreground/50 w-full bg-transparent text-[34px] caret-[var(--income)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
						/>
					</div>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="grid content-start gap-1.5">
						<FieldLabel htmlFor={`${id}-currency`}>Currency</FieldLabel>
						<select
							id={`${id}-currency`}
							name="currenciesId"
							required
							className={fieldSelectClass}
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
							<p className="text-muted-foreground text-[11.5px]">
								Amounts aren&apos;t converted if you change currency.
							</p>
						)}
					</div>
					<div className="grid content-start gap-1.5">
						<FieldLabel htmlFor={`${id}-due`}>
							Target date <span className="text-muted-foreground">· optional</span>
						</FieldLabel>
						<Input
							id={`${id}-due`}
							name="dueDate"
							type="date"
							min="0001-01-01"
							max="9999-12-31"
							defaultValue={goal?.dueDate ?? ""}
							className="h-11"
						/>
					</div>
				</div>
				<div className="grid gap-1.5">
					<span className="text-secondary-foreground text-[12.5px]">Status</span>
					<input type="hidden" name="status" value={status} />
					<SegmentedControl
						label="Status"
						value={status}
						onChange={setStatus}
						disabled={busy}
						options={statuses.map((value) => ({
							value,
							label: value[0].toUpperCase() + value.slice(1),
						}))}
					/>
				</div>
				<div className="grid gap-1.5">
					<FieldLabel htmlFor={`${id}-description`}>
						Notes <span className="text-muted-foreground">· optional</span>
					</FieldLabel>
					<textarea
						id={`${id}-description`}
						name="description"
						maxLength={500}
						rows={2}
						placeholder="What it's for"
						className="border-input bg-card placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-[11px] border px-3 py-2.5 text-sm outline-none focus-visible:ring-[3px]"
						defaultValue={goal?.description ?? ""}
					/>
				</div>
			</fieldset>
			<div className="flex gap-2.5">
				<Button
					type="button"
					variant="outline"
					className="h-11 rounded-xl px-4.5"
					disabled={busy}
					onClick={onCancel}
				>
					Cancel
				</Button>
				<Button type="submit" className="h-11 flex-1 rounded-xl" disabled={busy}>
					{busy ? "Saving…" : goal ? "Save changes" : "Create goal"}
				</Button>
			</div>
		</form>
	);
}
