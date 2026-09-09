"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import type { BankAccountResponse } from "@/db/queries/accounts";
import type { CurrencyResponse } from "@/db/queries/currencies";
import { Button } from "@/components/ui/button";
import { Money, Monogram, Panel } from "@/components/warm-ledger/primitives";
import type { AccountBalance } from "@/db/queries/overview";
import { formatMoney, monogram } from "@/lib/format";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type SerializableBankAccount = Omit<
	BankAccountResponse,
	"createdAt" | "updatedAt" | "deletedAt"
> & {
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	createdAtDisplay: string;
};

type AccountsListProps = {
	accounts: SerializableBankAccount[];
	currencies: CurrencyResponse[];
	/** Account id -> running balance and this month's movement. */
	balances: Record<string, Pick<AccountBalance, "balance" | "monthChange" | "currency">>;
};

export function AccountsList({
	accounts: initialAccounts,
	currencies,
	balances,
}: AccountsListProps) {
	const router = useRouter();
	const [accounts, setAccounts] = React.useState<SerializableBankAccount[]>(initialAccounts);
	const [pendingDeletions, setPendingDeletions] = React.useState<Set<string>>(() => new Set());
	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
	const [accountPendingDelete, setAccountPendingDelete] =
		React.useState<SerializableBankAccount | null>(null);

	React.useEffect(() => {
		setAccounts(initialAccounts);
	}, [initialAccounts]);

	const currencyLookup = React.useMemo(() => {
		const lookup = new Map<string, CurrencyResponse>();
		currencies.forEach((currency) => {
			lookup.set(currency.id, currency);
		});
		return lookup;
	}, [currencies]);

	const markPendingDeletion = React.useCallback((accountId: string, isPending: boolean) => {
		setPendingDeletions((prev) => {
			const next = new Set(prev);
			if (isPending) {
				next.add(accountId);
			} else {
				next.delete(accountId);
			}
			return next;
		});
	}, []);

	const deleteAccount = React.useCallback(
		async (accountId: string): Promise<boolean> => {
			markPendingDeletion(accountId, true);

			try {
				const res = await fetch(`/api/accounts/${accountId}`, {
					method: "DELETE",
				});

				if (!res.ok) {
					let errorMessage = "Failed to delete account.";
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

				setAccounts((prev) => prev.filter((account) => account.id !== accountId));
				toast.success("Account deleted.");
				router.refresh();
				return true;
			} catch (err) {
				const message =
					err instanceof Error ? err.message : "Failed to delete account. Please try again.";
				toast.error(message);
				return false;
			} finally {
				markPendingDeletion(accountId, false);
			}
		},
		[markPendingDeletion, router],
	);

	const handleDeleteDialogOpenChange = React.useCallback((open: boolean) => {
		setDeleteDialogOpen(open);
		if (!open) {
			setAccountPendingDelete(null);
		}
	}, []);

	const openDeleteDialog = React.useCallback((account: SerializableBankAccount) => {
		setAccountPendingDelete(account);
		setDeleteDialogOpen(true);
	}, []);

	const handleConfirmDelete = React.useCallback(async () => {
		if (!accountPendingDelete) return;
		const account = accountPendingDelete;
		setDeleteDialogOpen(false);
		setAccountPendingDelete(null);
		const succeeded = await deleteAccount(account.id);
		if (!succeeded) {
			setAccountPendingDelete(account);
			setDeleteDialogOpen(true);
		}
	}, [accountPendingDelete, deleteAccount]);

	const accountPendingDeleteIsDeleting = accountPendingDelete
		? pendingDeletions.has(accountPendingDelete.id)
		: false;

	return (
		<>
			<div className="flex flex-col gap-3">
				{accounts.length === 0 ? (
					<div className="border-border text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
						No accounts yet. Add your first one below.
					</div>
				) : (
					accounts.map((account) => {
						const currency = currencyLookup.get(account.currenciesId);
						const isDeleting = pendingDeletions.has(account.id);
						const figures = balances[account.id];
						const displayCurrency = figures?.currency ?? {
							isoCode: currency?.isoCode ?? "",
							symbol: currency?.symbol ?? "",
							position: "before" as const,
						};

						return (
							<Panel
								key={account.id}
								className={`group flex items-center gap-4 px-5.5 py-4.5 ${isDeleting ? "opacity-50" : ""}`}
							>
								<Monogram label={monogram(account.name)} className="size-11 rounded-[13px]" />

								<div className="min-w-0 flex-1 leading-snug">
									<div className="truncate text-[15px] font-semibold">{account.name}</div>
									<div className="text-muted-foreground truncate text-[12.5px]">
										{currency ? `${currency.symbol} ${currency.isoCode}` : "Unknown currency"}
										{account.iban ? ` · ${account.iban}` : ""}
									</div>
								</div>

								<div className="flex-none text-right leading-tight">
									<Money
										amount={figures?.balance ?? 0}
										currency={displayCurrency}
										className="text-2xl"
									/>
									<div className="text-muted-foreground text-[11.5px]">
										{figures && figures.monthChange !== 0
											? `${formatMoney(figures.monthChange, displayCurrency, { signed: true })} this month`
											: `Added ${account.createdAtDisplay}`}
									</div>
								</div>

								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-destructive size-8 flex-none opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
									onClick={() => openDeleteDialog(account)}
									disabled={isDeleting}
									type="button"
									aria-label={`Delete ${account.name}`}
								>
									<IconTrash className="size-4" />
								</Button>
							</Panel>
						);
					})
				)}
			</div>

			<Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete account</DialogTitle>
						<DialogDescription>
							{accountPendingDelete
								? `Are you sure you want to delete the account "${accountPendingDelete.name}"? This action cannot be undone.`
								: "Are you sure you want to delete this account? This action cannot be undone."}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={accountPendingDeleteIsDeleting}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmDelete}
							disabled={!accountPendingDelete || accountPendingDeleteIsDeleting}
						>
							{accountPendingDeleteIsDeleting ? "Deleting..." : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
