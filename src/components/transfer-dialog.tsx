"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconArrowsUpDown } from "@tabler/icons-react";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Monogram } from "@/components/warm-ledger/primitives";
import type { AccountBalance } from "@/db/queries/overview";
import { formatMoney, monogram } from "@/lib/format";
import { parseTransactionAmount } from "@/lib/validation/transactions";

type TransferAccount = Pick<AccountBalance, "id" | "name" | "balance" | "currency">;

/** "Move money" from the 5f spec: one amount, a from/to pair with a swap, then confirm. */
export function TransferDialog({
	accounts,
	defaultFromId,
	trigger,
}: {
	accounts: TransferAccount[];
	defaultFromId?: string;
	trigger: React.ReactNode;
}) {
	const [open, setOpen] = React.useState(false);
	const [formKey, setFormKey] = React.useState(0);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setFormKey((key) => key + 1);
			}}
		>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="gap-4 sm:max-w-[420px]">
				<DialogHeader>
					<DialogTitle className="text-base">Move money</DialogTitle>
					<DialogDescription className="sr-only">
						Move an amount between two of your accounts.
					</DialogDescription>
				</DialogHeader>
				<TransferForm
					key={formKey}
					accounts={accounts}
					defaultFromId={defaultFromId}
					onDone={() => setOpen(false)}
				/>
			</DialogContent>
		</Dialog>
	);
}

function TransferForm({
	accounts,
	defaultFromId,
	onDone,
}: {
	accounts: TransferAccount[];
	defaultFromId?: string;
	onDone: () => void;
}) {
	const router = useRouter();
	const initialFrom = accounts.find((account) => account.id === defaultFromId) ?? accounts[0];
	const [fromId, setFromId] = React.useState(initialFrom?.id ?? "");
	const [toId, setToId] = React.useState(
		() =>
			accounts.find(
				(account) =>
					account.id !== initialFrom?.id &&
					account.currency.isoCode === initialFrom?.currency.isoCode,
			)?.id ?? "",
	);
	const [amount, setAmount] = React.useState("");
	const [pending, setPending] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);

	const from = accounts.find((account) => account.id === fromId);
	const to = accounts.find((account) => account.id === toId);
	// No FX rates, so only same-currency accounts can receive.
	const destinations = accounts.filter(
		(account) => account.id !== fromId && account.currency.isoCode === from?.currency.isoCode,
	);

	let parsedAmount: number | null = null;
	try {
		parsedAmount = amount ? parseTransactionAmount(amount) : null;
	} catch {
		parsedAmount = null;
	}
	const amountValid = parsedAmount !== null && parsedAmount > 0;
	const canSubmit = Boolean(from && to) && amountValid && !pending;

	function changeFrom(id: string) {
		setFromId(id);
		const next = accounts.find((account) => account.id === id);
		if (!to || to.id === id || to.currency.isoCode !== next?.currency.isoCode) {
			setToId(
				accounts.find(
					(account) => account.id !== id && account.currency.isoCode === next?.currency.isoCode,
				)?.id ?? "",
			);
		}
	}

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!canSubmit || parsedAmount === null) return;
		setPending(true);
		setError(null);
		try {
			const response = await fetch("/api/transfers", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount: parsedAmount }),
			});
			const payload = await response.json().catch(() => null);
			if (!response.ok) throw new Error(payload?.error ?? "We couldn't move the money.");
			toast.success(`Moved ${formatMoney(parsedAmount, from!.currency)} to ${to!.name}.`);
			onDone();
			router.refresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "We couldn't move the money.");
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4">
			{error ? <FormAlert>{error}</FormAlert> : null}

			<div className="bg-sunk/40 border-border rounded-2xl border px-4.5 py-4 focus-within:border-[var(--income)]">
				<label htmlFor="transfer-amount" className="text-eyebrow block">
					Amount
				</label>
				<div className="mt-1 flex items-baseline gap-2">
					<input
						id="transfer-amount"
						size={1}
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						inputMode="decimal"
						autoComplete="off"
						placeholder="0.00"
						autoFocus
						className="text-money placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-[42px] caret-[var(--income)] outline-none"
					/>
					{from ? (
						<span className="text-muted-foreground text-[12.5px]">{from.currency.isoCode}</span>
					) : null}
				</div>
			</div>

			<div className="relative flex flex-col">
				<AccountPicker
					label="From"
					value={fromId}
					options={accounts}
					onChange={changeFrom}
					className="rounded-t-xl rounded-b-[4px]"
				/>
				<AccountPicker
					label="To"
					value={toId}
					options={destinations}
					onChange={setToId}
					placeholder={
						destinations.length === 0 ? "No other account in this currency" : "Choose an account"
					}
					className="rounded-t-[4px] rounded-b-xl border-t-0"
				/>
				<button
					type="button"
					onClick={() => {
						if (!to) return;
						setFromId(to.id);
						setToId(fromId);
					}}
					disabled={!to}
					aria-label="Swap accounts"
					className="bg-primary text-primary-foreground focus-visible:ring-ring/50 absolute top-1/2 right-4.5 flex size-7.5 -translate-y-1/2 items-center justify-center rounded-full shadow-[0_0_0_4px_var(--card)] outline-none focus-visible:ring-[3px] disabled:opacity-50"
				>
					<IconArrowsUpDown className="size-4" />
				</button>
			</div>

			<p className="bg-sunk/40 border-border text-secondary-foreground rounded-xl border px-3.5 py-3 text-[12.5px] leading-relaxed">
				Transfers don&apos;t touch budgets — they&apos;re moves, not spending.
				{from && to && amountValid
					? ` ${from.name} goes to ${formatMoney(from.balance - parsedAmount!, from.currency)}.`
					: ""}
			</p>

			<div className="flex gap-2.5">
				<Button
					type="button"
					variant="outline"
					className="h-11 flex-1 rounded-xl"
					onClick={onDone}
					disabled={pending}
				>
					Cancel
				</Button>
				<Button type="submit" className="h-11 flex-1 rounded-xl" disabled={!canSubmit}>
					{pending
						? "Moving…"
						: amountValid && from
							? `Move ${formatMoney(parsedAmount!, from.currency)}`
							: "Move money"}
				</Button>
			</div>
		</form>
	);
}

function AccountPicker({
	label,
	value,
	options,
	onChange,
	placeholder = "Choose an account",
	className,
}: {
	label: string;
	value: string;
	options: TransferAccount[];
	onChange: (id: string) => void;
	placeholder?: string;
	className?: string;
}) {
	const id = React.useId();
	const selected = options.find((account) => account.id === value);

	return (
		<div
			className={`border-input focus-within:bg-sunk/30 relative flex items-center gap-3 border py-3 pr-14 pl-3.5 ${className ?? ""}`}
		>
			<Monogram
				label={selected ? monogram(selected.name) : "—"}
				className="size-8.5 rounded-[11px]"
			/>
			<div className="min-w-0 flex-1 leading-tight">
				<label htmlFor={id} className="text-muted-foreground block text-[11.5px]">
					{label}
				</label>
				<select
					id={id}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					disabled={options.length === 0}
					className="w-full appearance-none truncate bg-transparent text-[13.5px] font-medium outline-none"
				>
					{selected ? null : <option value="">{placeholder}</option>}
					{options.map((account) => (
						<option key={account.id} value={account.id}>
							{account.name} · {formatMoney(account.balance, account.currency)}
						</option>
					))}
				</select>
			</div>
		</div>
	);
}
