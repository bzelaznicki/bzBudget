"use client";

import * as React from "react";
import {
	type Column,
	ColumnDef,
	SortingState,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	IconArrowsSort,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconChevronUp,
	IconChevronsLeft,
	IconChevronsRight,
	IconTrash,
} from "@tabler/icons-react";

import type { TransactionResponse } from "@/db/queries/transactions";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Badge } from "@/components/ui/badge";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useTransactionEvents } from "@/contexts/transaction-events-context";
import { toast } from "sonner";

type TransactionRow = TransactionResponse & {
	amountNumber: number;
	bookedAtDate: Date | null;
};

const PAGE_SIZE_OPTIONS = ["10", "20", "50"];
const ALL_OPTION = "all";
const UNCATEGORIZED_OPTION = "uncategorized";
const NUMBER_FORMATTER = new Intl.NumberFormat("en-GB");
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: true,
});

const BASE_COLUMNS: ColumnDef<TransactionRow>[] = [
	{
		id: "bookedAt",
		accessorFn: (row) => row.bookedAtDate?.getTime() ?? 0,
		header: ({ column }) => <SortableHeader column={column} label="Booked" />,
		cell: ({ row }) => formatDateTime(row.original.bookedAtDate),
	},
	{
		accessorKey: "counterparty",
		header: ({ column }) => <SortableHeader column={column} label="Counterparty" />,
		enableSorting: true,
		cell: ({ row }) => row.original.counterparty || "—",
	},
	{
		accessorKey: "description",
		header: "Description",
		enableSorting: false,
		cell: ({ row }) => (
			<span className="line-clamp-2 max-w-[28ch] text-muted-foreground">
				{row.original.description || "—"}
			</span>
		),
	},
	{
		id: "category",
		header: "Category",
		cell: ({ row }) =>
			row.original.category ? (
				row.original.category.name
			) : (
				<span className="text-muted-foreground italic">Uncategorized</span>
			),
	},
	{
		id: "amount",
		accessorFn: (row) => row.amountNumber,
		header: ({ column }) => <SortableHeader column={column} label="Amount" align="right" />,
		cell: ({ row }) => (
			<div className="text-right tabular-nums font-medium">
				{formatAmount(row.original.amountNumber, row.original.currency)}
			</div>
		),
	},
	{
		id: "currency",
		accessorFn: (row) => row.currency.isoCode,
		header: ({ column }) => <SortableHeader column={column} label="Currency" />,
		cell: ({ row }) => (
			<CurrencyBadge
				symbol={row.original.currency.symbol}
				isoCode={row.original.currency.isoCode}
			/>
		),
	},
	{
		accessorKey: "type",
		header: ({ column }) => <SortableHeader column={column} label="Type" />,
		cell: ({ row }) => (
			<Badge variant="outline" className="capitalize">
				{row.original.type}
			</Badge>
		),
	},
];

export function TransactionsTableClient({ data }: { data: TransactionResponse[] }) {
	const [transactions, setTransactions] = React.useState<TransactionResponse[]>(data);

	React.useEffect(() => {
		setTransactions(data);
	}, [data]);

	const { subscribeTransactionCreated, emitTransactionCreated } = useTransactionEvents();
	const [pendingDeletions, setPendingDeletions] = React.useState<Set<string>>(new Set());
	const [deleteDialogOpen, setDeleteDialogOpen] = React.useState<boolean>(false);
	const [transactionPendingDelete, setTransactionPendingDelete] = React.useState<TransactionRow | null>(null);

	React.useEffect(() => {
		return subscribeTransactionCreated((transaction) => {
			setTransactions((prev) => [transaction, ...prev]);
			setPagination((prev) => ({
				...prev,
				pageIndex: 0,
			}));
		});
	}, [subscribeTransactionCreated]);

	const preparedData = React.useMemo<TransactionRow[]>(() => {
		return transactions.map((transaction) => ({
			...transaction,
			amountNumber: parseAmount(transaction.amount),
			bookedAtDate: toDate(transaction.bookedAt),
		}));
	}, [transactions]);

	const [selectedCurrency, setSelectedCurrency] = React.useState<string>(ALL_OPTION);
	const [selectedCategory, setSelectedCategory] = React.useState<string>(ALL_OPTION);
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "bookedAt", desc: true }]);
	const [{ pageIndex, pageSize }, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: Number(PAGE_SIZE_OPTIONS[0]),
	});

	const handleTransactionCreated = React.useCallback(
		(transaction: TransactionResponse) => {
			emitTransactionCreated(transaction);
		},
		[emitTransactionCreated],
	);
	const markPendingDeletion = React.useCallback((transactionId: string, isPending: boolean) => {
		setPendingDeletions((prev) => {
			const next = new Set(prev);
			if (isPending) {
				next.add(transactionId);
			} else {
				next.delete(transactionId);
			}
			return next;
		});
	}, []);

	const deleteTransaction = React.useCallback(
		async (transactionId: string): Promise<boolean> => {
			const url = `/api/transactions/${transactionId}`;

			markPendingDeletion(transactionId, true);

			try {
				const res = await fetch(url, {
					method: "DELETE",
				});

				if (!res.ok) {
					let errorMessage = "Failed to delete transaction.";
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

				setTransactions((prev) => prev.filter((transaction) => transaction.id !== transactionId));
				toast.success("Transaction deleted.");
				return true;
			} catch (err) {
				const message =
					err instanceof Error
						? err.message
						: "Failed to delete transaction. Please try again.";
				toast.error(message);
				return false;
			} finally {
				markPendingDeletion(transactionId, false);
			}
		},
		[markPendingDeletion],
	);

	const handleDeleteDialogOpenChange = React.useCallback((open: boolean) => {
		setDeleteDialogOpen(open);
		if (!open) {
			setTransactionPendingDelete(null);
		}
	}, []);

	const openDeleteDialog = React.useCallback((transaction: TransactionRow) => {
		setTransactionPendingDelete(transaction);
		setDeleteDialogOpen(true);
	}, []);

	const handleConfirmDelete = React.useCallback(async () => {
		if (!transactionPendingDelete) return;
		const succeeded = await deleteTransaction(transactionPendingDelete.id);
		if (succeeded) {
			setDeleteDialogOpen(false);
			setTransactionPendingDelete(null);
		}
	}, [deleteTransaction, transactionPendingDelete]);

	const currencyOptions = React.useMemo(() => {
		const uniqueCurrencies = new Map<string, TransactionRow["currency"]>();
		for (const transaction of preparedData) {
			if (!uniqueCurrencies.has(transaction.currency.isoCode)) {
				uniqueCurrencies.set(transaction.currency.isoCode, transaction.currency);
			}
		}
		return Array.from(uniqueCurrencies.values());
	}, [preparedData]);

	const categoryOptions = React.useMemo(() => {
		const uniqueCategories = new Map<
			string,
			{ id: string; name: string; isUncategorized: boolean }
		>();
		for (const transaction of preparedData) {
			if (transaction.category) {
				if (!uniqueCategories.has(transaction.category.id)) {
					uniqueCategories.set(transaction.category.id, {
						id: transaction.category.id,
						name: transaction.category.name,
						isUncategorized: false,
					});
				}
			} else if (!uniqueCategories.has(UNCATEGORIZED_OPTION)) {
				uniqueCategories.set(UNCATEGORIZED_OPTION, {
					id: UNCATEGORIZED_OPTION,
					name: "Uncategorized",
					isUncategorized: true,
				});
			}
		}
		return Array.from(uniqueCategories.values());
	}, [preparedData]);

	React.useEffect(() => {
		setPagination((prev) => {
			if (prev.pageIndex === 0) {
				return prev;
			}
			return {
				...prev,
				pageIndex: 0,
			};
		});
	}, [selectedCurrency, selectedCategory]);

	const filteredData = React.useMemo(() => {
		return preparedData.filter((transaction) => {
			const matchesCurrency =
				selectedCurrency === ALL_OPTION || transaction.currency.isoCode === selectedCurrency;

			const matchesCategory =
				selectedCategory === ALL_OPTION ||
				(selectedCategory === UNCATEGORIZED_OPTION
					? !transaction.category
					: transaction.category?.id === selectedCategory);

			return matchesCurrency && matchesCategory;
		});
	}, [preparedData, selectedCurrency, selectedCategory]);

	React.useEffect(() => {
		const pageCount = filteredData.length === 0 ? 0 : Math.ceil(filteredData.length / pageSize);
		if (pageCount === 0) {
			if (pageIndex !== 0) {
				setPagination((prev) => ({
					...prev,
					pageIndex: 0,
				}));
			}
			return;
		}

		if (pageIndex >= pageCount) {
			setPagination((prev) => ({
				...prev,
				pageIndex: Math.max(pageCount - 1, 0),
			}));
		}
	}, [filteredData.length, pageIndex, pageSize]);

	const columns = React.useMemo<ColumnDef<TransactionRow>[]>(() => {
		return [
			...BASE_COLUMNS,
			{
				id: "actions",
				header: () => <span className="sr-only">Actions</span>,
				enableSorting: false,
				cell: ({ row }) => {
					const transactionId = row.original.id;
					const isDeleting = pendingDeletions.has(transactionId);

					return (
						<div className="flex w-full justify-end">
							<Button
								variant="ghost"
								size="icon"
								className="size-8 text-destructive hover:text-destructive focus-visible:text-destructive"
								onClick={() => openDeleteDialog(row.original)}
								disabled={isDeleting}
								type="button"
								aria-label="Delete transaction"
							>
								<IconTrash className={`size-4 ${isDeleting ? "opacity-50" : ""}`} />
							</Button>
						</div>
					);
				},
			},
		];
	}, [openDeleteDialog, pendingDeletions]);

	const table = useReactTable({
		data: filteredData,
		columns,
		state: {
			sorting,
			pagination: { pageIndex, pageSize },
		},
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		initialState: {
			pagination: {
				pageIndex: 0,
				pageSize: Number(PAGE_SIZE_OPTIONS[0]),
			},
		},
	});

	const totalRecords = preparedData.length;
	const totalRows = table.getPrePaginationRowModel().rows.length;
	const displayFrom = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
	const displayTo = Math.min(totalRows, (pageIndex + 1) * pageSize);
	const currentPage = table.getPageCount() === 0 ? 0 : pageIndex + 1;
	const isSelectedDeleting = transactionPendingDelete
		? pendingDeletions.has(transactionPendingDelete.id)
		: false;
	const counterpartyLabel = transactionPendingDelete?.counterparty?.trim();
	const deleteDescription = transactionPendingDelete
		? `Are you sure you want to delete this transaction${
				counterpartyLabel ? ` from "${counterpartyLabel}"` : ""
			} for ${formatAmount(transactionPendingDelete.amountNumber, transactionPendingDelete.currency)}? This action cannot be undone.`
		: "Are you sure you want to delete this transaction? This action cannot be undone.";

	return (
		<>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">Rows per page</span>
								<Select
									value={String(pageSize)}
									onValueChange={(value) =>
										setPagination(() => ({
											pageIndex: 0,
											pageSize: Number(value),
										}))
									}
								>
									<SelectTrigger className="h-8 w-20">
										<SelectValue />
									</SelectTrigger>
									<SelectContent align="start">
										{PAGE_SIZE_OPTIONS.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">Currency</span>
								<Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
									<SelectTrigger className="h-8 w-[9rem]">
										<SelectValue placeholder="All currencies" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectItem value={ALL_OPTION}>All currencies</SelectItem>
										{currencyOptions.map((currency) => (
											<SelectItem
												key={currency.isoCode}
												value={currency.isoCode}
												className="flex items-center gap-2"
											>
												<CurrencyBadge symbol={currency.symbol} isoCode={currency.isoCode} />
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">Category</span>
								<Select value={selectedCategory} onValueChange={setSelectedCategory}>
									<SelectTrigger className="h-8 w-[11rem]">
										<SelectValue placeholder="All categories" />
									</SelectTrigger>
									<SelectContent align="start">
										<SelectItem value={ALL_OPTION}>All categories</SelectItem>
										{categoryOptions.map((category) => (
											<SelectItem key={category.id} value={category.id}>
												{category.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
						<div className="self-start sm:self-auto">
							<AddTransactionDialog onTransactionCreated={handleTransactionCreated} />
						</div>
					</div>
					<div className="text-sm text-muted-foreground">
						Showing {NUMBER_FORMATTER.format(displayFrom)} – {NUMBER_FORMATTER.format(displayTo)} of{" "}
						{NUMBER_FORMATTER.format(totalRows)}
						{(selectedCurrency !== ALL_OPTION || selectedCategory !== ALL_OPTION) &&
							totalRecords > 0 ? (
							<> (filtered from {NUMBER_FORMATTER.format(totalRecords)})</>
						) : null}
					</div>
				</div>

				<div className="overflow-hidden rounded-lg border">
					<Table>
						<TableHeader className="bg-muted">
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									))}
								</TableRow>
							))}
						</TableHeader>
						<TableBody>
							{table.getRowModel().rows.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(cell.column.columnDef.cell, cell.getContext())}
											</TableCell>
										))}
									</TableRow>
								))
							) : (
								<TableRow>
									<TableCell colSpan={columns.length} className="h-24 text-center">
										No transactions found.
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div className="text-sm text-muted-foreground">
						Page {NUMBER_FORMATTER.format(currentPage)} of{" "}
						{NUMBER_FORMATTER.format(table.getPageCount())}
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
							className="size-8"
						>
							<span className="sr-only">Go to first page</span>
							<IconChevronsLeft className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
							className="size-8"
						>
							<span className="sr-only">Go to previous page</span>
							<IconChevronLeft className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
							className="size-8"
						>
							<span className="sr-only">Go to next page</span>
							<IconChevronRight className="size-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
							disabled={!table.getCanNextPage()}
							className="size-8"
						>
							<span className="sr-only">Go to last page</span>
							<IconChevronsRight className="size-4" />
						</Button>
					</div>
				</div>
			</div>

			<Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete transaction</DialogTitle>
						<DialogDescription>{deleteDescription}</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" disabled={isSelectedDeleting}>
								Cancel
							</Button>
						</DialogClose>
						<Button
							type="button"
							variant="destructive"
							onClick={handleConfirmDelete}
							disabled={!transactionPendingDelete || isSelectedDeleting}
						>
							{isSelectedDeleting ? "Deleting..." : "Confirm"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function SortableHeader({
	column,
	label,
	align = "left",
}: {
	column: Column<TransactionRow, unknown>;
	label: string;
	align?: "left" | "right";
}) {
	const sorted = column.getIsSorted();
	const alignmentClasses = align === "right" ? "ml-auto -mr-2 justify-end" : "-ml-3 justify-start";

	return (
		<Button
			variant="ghost"
			size="sm"
			className={`flex h-8 items-center gap-2 px-2 ${alignmentClasses}`}
			onClick={() => column.toggleSorting(sorted === "asc")}
		>
			<span>{label}</span>
			<span className="text-muted-foreground">
				{sorted === "desc" ? (
					<IconChevronDown className="size-4" />
				) : sorted === "asc" ? (
					<IconChevronUp className="size-4" />
				) : (
					<IconArrowsSort className="size-4" />
				)}
			</span>
		</Button>
	);
}

function toDate(value: Date | string | null): Date | null {
	if (!value) return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(amount: string | null): number {
	if (!amount) return 0;
	const parsed = Number(amount);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(amount: number, currency: TransactionResponse["currency"]) {
	if (!Number.isFinite(amount) || !currency) return "—";

	try {
		const formatter = new Intl.NumberFormat("en-GB", {
			style: "currency",
			currency: currency.isoCode ?? "USD",
		});
		return formatter.format(amount);
	} catch {
		const fallbackSymbol = currency.symbol ?? currency.isoCode;
		const formatted = amount.toLocaleString("en-GB", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
		return currency.position === "before"
			? `${fallbackSymbol}${formatted}`
			: `${formatted}${fallbackSymbol}`;
	}
}

function CurrencyBadge({ symbol, isoCode }: { symbol: string | null; isoCode: string }) {
	const displaySymbol = symbol ?? isoCode;
	return (
		<Badge variant="outline" className="gap-1">
			<span>{displaySymbol}</span>
			<span className="text-muted-foreground text-xs uppercase">{isoCode}</span>
		</Badge>
	);
}

function formatDateTime(date: Date | null) {
	if (!date) return "—";
	return DATE_TIME_FORMATTER.format(date);
}
