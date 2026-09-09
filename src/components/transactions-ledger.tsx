"use client";

import * as React from "react";
import {
	IconChevronLeft,
	IconChevronRight,
	IconChevronsLeft,
	IconChevronsRight,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Amount, CategoryChip, Monogram, Panel } from "@/components/warm-ledger/primitives";
import { useTransactionEvents } from "@/contexts/transaction-events-context";
import type { TransactionResponse } from "@/db/queries/transactions";
import { formatDayHeading, formatMoney, monogram } from "@/lib/format";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;
const ALL_CATEGORIES = "__all__";

type TransactionResponseLike = Omit<TransactionResponse, "bookedAt" | "createdAt" | "updatedAt"> & {
	bookedAt: string | Date;
	createdAt: string | Date | null;
	updatedAt: string | Date | null;
};

type TransactionsApiResponse = {
	total: number;
	pages: number;
	transactions: TransactionResponseLike[];
};

type LedgerEntry = TransactionResponse & {
	/** Negative for outgoing, positive for incoming. */
	signedAmount: number;
	bookedAtDate: Date;
};

type DayGroup = {
	key: string;
	heading: string;
	total: number;
	entries: LedgerEntry[];
};

function toEntry(transaction: TransactionResponseLike): LedgerEntry {
	const magnitude = Math.abs(Number(transaction.amount));
	const bookedAtDate = new Date(transaction.bookedAt);

	return {
		...transaction,
		bookedAt: bookedAtDate,
		createdAt: transaction.createdAt ? new Date(transaction.createdAt) : null,
		updatedAt: transaction.updatedAt ? new Date(transaction.updatedAt) : null,
		bookedAtDate,
		signedAmount: transaction.type === "incoming" ? magnitude : -magnitude,
	};
}

/** Buckets entries by calendar day, newest first, with each day's net movement. */
function groupByDay(entries: LedgerEntry[]): DayGroup[] {
	const groups = new Map<string, DayGroup>();

	for (const entry of entries) {
		const key = entry.bookedAtDate.toDateString();
		const group = groups.get(key);

		if (group) {
			group.entries.push(entry);
			group.total += entry.signedAmount;
		} else {
			groups.set(key, {
				key,
				heading: formatDayHeading(entry.bookedAtDate),
				total: entry.signedAmount,
				entries: [entry],
			});
		}
	}

	return Array.from(groups.values()).sort(
		(a, b) =>
			(b.entries[0]?.bookedAtDate.getTime() ?? 0) - (a.entries[0]?.bookedAtDate.getTime() ?? 0),
	);
}

export function TransactionsLedger({
	accountNames,
}: {
	/** Account id -> display name, so rows can name the account they belong to. */
	accountNames: Record<string, string>;
}) {
	const [entries, setEntries] = React.useState<LedgerEntry[]>([]);
	const [total, setTotal] = React.useState(0);
	const [pages, setPages] = React.useState(0);
	const [pageIndex, setPageIndex] = React.useState(0);
	const [isLoading, setIsLoading] = React.useState(true);
	const [error, setError] = React.useState<string | null>(null);
	const [reloadKey, setReloadKey] = React.useState(0);
	const [search, setSearch] = React.useState("");
	const [category, setCategory] = React.useState(ALL_CATEGORIES);
	const [pendingDelete, setPendingDelete] = React.useState<LedgerEntry | null>(null);
	const [isDeleting, setIsDeleting] = React.useState(false);

	const { subscribeTransactionCreated } = useTransactionEvents();

	React.useEffect(() => {
		const controller = new AbortController();

		async function load() {
			setIsLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams({
					page: String(pageIndex + 1),
					perPage: String(PAGE_SIZE),
				});
				const response = await fetch(`/api/transactions?${params}`, {
					signal: controller.signal,
				});
				const payload = (await response.json()) as TransactionsApiResponse & { error?: string };

				if (!response.ok) {
					throw new Error(payload?.error ?? "Error fetching transactions");
				}

				if (controller.signal.aborted) return;

				setEntries((payload.transactions ?? []).map(toEntry));
				setTotal(payload.total ?? 0);
				setPages(payload.pages ?? 0);
			} catch (err) {
				if (controller.signal.aborted) return;
				setError(err instanceof Error ? err.message : "Error fetching transactions");
				setEntries([]);
				setTotal(0);
				setPages(0);
			} finally {
				if (!controller.signal.aborted) setIsLoading(false);
			}
		}

		void load();
		return () => controller.abort();
	}, [pageIndex, reloadKey]);

	React.useEffect(
		() =>
			subscribeTransactionCreated(() => {
				setPageIndex(0);
				setReloadKey((key) => key + 1);
			}),
		[subscribeTransactionCreated],
	);

	const categories = React.useMemo(() => {
		const names = new Set<string>();
		for (const entry of entries) {
			if (entry.category?.name) names.add(entry.category.name);
		}
		return Array.from(names).sort();
	}, [entries]);

	// Search and category narrow the page already loaded; the server handles paging.
	const visible = React.useMemo(() => {
		const needle = search.trim().toLowerCase();

		return entries.filter((entry) => {
			if (category !== ALL_CATEGORIES && entry.category?.name !== category) return false;
			if (!needle) return true;

			return [
				entry.counterparty,
				entry.description ?? "",
				entry.category?.name ?? "",
				String(entry.amount),
			].some((field) => field.toLowerCase().includes(needle));
		});
	}, [entries, search, category]);

	const groups = React.useMemo(() => groupByDay(visible), [visible]);

	async function confirmDelete() {
		if (!pendingDelete) return;
		setIsDeleting(true);

		try {
			const response = await fetch(`/api/transactions/${pendingDelete.id}`, { method: "DELETE" });

			if (!response.ok) {
				const payload = await response.json().catch(() => null);
				throw new Error(payload?.error ?? "Failed to delete transaction.");
			}

			toast.success("Transaction deleted.");
			setPendingDelete(null);
			setReloadKey((key) => key + 1);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to delete transaction.");
		} finally {
			setIsDeleting(false);
		}
	}

	const rangeStart = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
	const rangeEnd = Math.min((pageIndex + 1) * PAGE_SIZE, total);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2.5">
				<div className="relative min-w-[280px] flex-1 sm:max-w-sm">
					<IconSearch className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Search merchants, notes, amounts…"
						className="h-[34px] rounded-[10px] pl-9 text-[13px]"
						aria-label="Search transactions"
					/>
				</div>

				<FilterChip
					active={category === ALL_CATEGORIES}
					onClick={() => setCategory(ALL_CATEGORIES)}
				>
					All categories
				</FilterChip>
				{categories.map((name) => (
					<FilterChip
						key={name}
						active={category === name}
						onClick={() => setCategory(category === name ? ALL_CATEGORIES : name)}
					>
						{name}
					</FilterChip>
				))}

				<span className="text-muted-foreground ml-auto text-[12.5px]">Sorted by newest</span>
			</div>

			<Panel className="overflow-hidden">
				{isLoading ? (
					<LedgerSkeleton />
				) : error ? (
					<div className="flex flex-col items-center gap-3 py-14">
						<p className="text-muted-foreground text-sm">{error}</p>
						<Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
							Try again
						</Button>
					</div>
				) : groups.length === 0 ? (
					<p className="text-muted-foreground py-14 text-center text-sm">
						{total === 0
							? "No transactions yet — add one to start your ledger."
							: "Nothing on this page matches those filters."}
					</p>
				) : (
					groups.map((group) => (
						<section key={group.key}>
							<div className="bg-sunk/60 border-border flex items-center justify-between border-b px-5.5 py-3">
								<span className="text-eyebrow text-[12px] tracking-[0.06em]">{group.heading}</span>
								<span className="text-numeric text-secondary-foreground text-[12.5px]">
									{formatMoney(group.total, group.entries[0].currency, { signed: true })}
								</span>
							</div>

							{group.entries.map((entry) => (
								<div
									key={entry.id}
									className="border-border flex items-center gap-3.5 border-b px-5.5 py-3"
								>
									<Monogram label={monogram(entry.counterparty)} className="size-9.5 rounded-xl" />
									<div className="min-w-0 flex-1 leading-tight">
										<div className="truncate text-sm font-medium">{entry.counterparty}</div>
										<div className="text-muted-foreground truncate text-[11.5px]">
											{[entry.description || "—", accountNames[entry.accountsId]]
												.filter(Boolean)
												.join(" · ")}
										</div>
									</div>
									{entry.category?.name ? <CategoryChip>{entry.category.name}</CategoryChip> : null}
									<Amount
										amount={entry.signedAmount}
										currency={entry.currency}
										className="w-[120px] flex-none text-right text-[14.5px]"
									/>
									<Button
										variant="ghost"
										size="icon"
										className="text-muted-foreground hover:text-destructive size-8"
										onClick={() => setPendingDelete(entry)}
									>
										<IconTrash className="size-4" />
										<span className="sr-only">Delete {entry.counterparty}</span>
									</Button>
								</div>
							))}
						</section>
					))
				)}

				<div className="flex items-center justify-between px-5.5 py-3.5">
					<span className="text-muted-foreground text-[12.5px]">
						{total === 0 ? "No transactions" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
					</span>
					<div className="flex gap-1.5">
						<PagerButton
							label="First page"
							icon={<IconChevronsLeft className="size-4" />}
							disabled={pageIndex === 0}
							onClick={() => setPageIndex(0)}
						/>
						<PagerButton
							label="Previous page"
							icon={<IconChevronLeft className="size-4" />}
							disabled={pageIndex === 0}
							onClick={() => setPageIndex((index) => Math.max(index - 1, 0))}
						/>
						<PagerButton
							label="Next page"
							icon={<IconChevronRight className="size-4" />}
							disabled={pageIndex >= pages - 1}
							onClick={() => setPageIndex((index) => Math.min(index + 1, pages - 1))}
						/>
						<PagerButton
							label="Last page"
							icon={<IconChevronsRight className="size-4" />}
							disabled={pageIndex >= pages - 1}
							onClick={() => setPageIndex(Math.max(pages - 1, 0))}
						/>
					</div>
				</div>
			</Panel>

			<Dialog
				open={pendingDelete !== null}
				onOpenChange={(open) => !open && setPendingDelete(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete transaction</DialogTitle>
						<DialogDescription>
							{pendingDelete
								? `${pendingDelete.counterparty} · ${formatMoney(
										pendingDelete.signedAmount,
										pendingDelete.currency,
										{ signed: true },
									)}. This can't be undone.`
								: null}
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="outline" disabled={isDeleting}>
								Cancel
							</Button>
						</DialogClose>
						<Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
							{isDeleting ? "Deleting…" : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function FilterChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={cn(
				"h-[34px] rounded-full border px-3.5 text-[12.5px] transition-colors",
				active
					? "bg-primary text-primary-foreground border-primary"
					: "bg-card border-border text-secondary-foreground hover:bg-sunk",
			)}
		>
			{children}
		</button>
	);
}

function PagerButton({
	label,
	icon,
	disabled,
	onClick,
}: {
	label: string;
	icon: React.ReactNode;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant="outline"
			size="icon"
			className="size-[30px] rounded-[9px]"
			disabled={disabled}
			onClick={onClick}
		>
			{icon}
			<span className="sr-only">{label}</span>
		</Button>
	);
}

function LedgerSkeleton() {
	return (
		<div className="flex flex-col">
			{[0, 1].map((group) => (
				<section key={group}>
					<div className="bg-sunk/60 border-border border-b px-5.5 py-3">
						<Skeleton className="h-3 w-48 rounded-full" />
					</div>
					{[0, 1, 2].map((row) => (
						<div key={row} className="border-border flex items-center gap-3.5 border-b px-5.5 py-3">
							<Skeleton className="size-9.5 flex-none rounded-xl" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-40 rounded-full" />
								<Skeleton className="h-3 w-56 rounded-full" />
							</div>
							<Skeleton className="h-4 w-24 rounded-full" />
						</div>
					))}
				</section>
			))}
		</div>
	);
}
