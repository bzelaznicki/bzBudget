"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

import type { BankAccountResponse } from "@/db/queries/accounts";
import type { CurrencyResponse } from "@/db/queries/currencies";
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

type SerializableBankAccount = Omit<BankAccountResponse, "createdAt" | "updatedAt" | "deletedAt"> & {
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	createdAtDisplay: string;
};

type AccountsListProps = {
	accounts: SerializableBankAccount[];
	currencies: CurrencyResponse[];
};

export function AccountsList({ accounts: initialAccounts, currencies }: AccountsListProps) {
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
			{accounts.length === 0 ? (
				<div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
					No accounts yet. Use the form on the right to add your first account.
				</div>
			) : (
				accounts.map((account) => {
					const currency = currencyLookup.get(account.currenciesId);
					const isDeleting = pendingDeletions.has(account.id);

					return (
						<div
							key={account.id}
							className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p className="text-sm font-medium text-gray-900">{account.name}</p>
								<p className="text-xs text-gray-500">
									{currency ? `${currency.symbol} ${currency.isoCode}` : "Unknown currency"}
									{account.iban ? ` • IBAN ${account.iban}` : null}
								</p>
							</div>
							<div className="text-right text-xs text-gray-400">
								<p>Created {account.createdAtDisplay}</p>
							</div>
							<div className="text-right text-xs text-gray-400">
								<Button
									variant="ghost"
									size="icon"
									className="size-8 text-destructive hover:text-destructive focus-visible:text-destructive"
									onClick={() => openDeleteDialog(account)}
									disabled={isDeleting}
									type="button"
									aria-label="Delete account"
								>
									<IconTrash className={`size-4 ${isDeleting ? "opacity-50" : ""}`} />
								</Button>
							</div>
						</div>
					);
				})
			)}

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
