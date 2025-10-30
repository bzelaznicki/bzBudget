"use client";

import * as React from "react";
import {
	type Column,
	ColumnDef,
	type PaginationState,
	type SortingState,
	flexRender,
	getCoreRowModel,
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
} from "@tabler/icons-react";

import type { TransactionResponse } from "@/db/queries/transactions";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

type TransactionRow = TransactionResponse & {
	amountNumber: number;
	bookedAtDate: Date | null;
	createdAtDate: Date | null;
	updatedAtDate: Date | null;
};

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
const DEFAULT_PAGE_SIZE = Number(PAGE_SIZE_OPTIONS[0]);

const columns: ColumnDef<TransactionRow>[] = [
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
	{
		id: "createdAt",
		accessorFn: (row) => row.createdAtDate?.getTime() ?? 0,
		header: ({ column }) => <SortableHeader column={column} label="Created" />,
		cell: ({ row }) => formatDateTime(row.original.createdAtDate),
	},
	{
		id: "updatedAt",
		accessorFn: (row) => row.updatedAtDate?.getTime() ?? 0,
		header: ({ column }) => <SortableHeader column={column} label="Updated" />,
		cell: ({ row }) => formatDateTime(row.original.updatedAtDate),
	},
];

export function TransactionsDataTable() {
	const [error, setError] = React.useState<string | null>(null);
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [transactions, setTransactions] = React.useState<TransactionResponse[]>([]);
	const [totalTransactions, setTotalTransactions] = React.useState<number>(0);
	const [totalPages, setTotalPages] = React.useState<number>(0);
	const [selectedCurrency, setSelectedCurrency] = React.useState<string>(ALL_OPTION);
	const [selectedCategory, setSelectedCategory] = React.useState<string>(ALL_OPTION);
	const [sorting, setSorting] = React.useState<SortingState>([{ id: "bookedAt", desc: true }]);
	const [reloadKey, setReloadKey] = React.useState<number>(0);
	const [{ pageIndex, pageSize }, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: DEFAULT_PAGE_SIZE,
	});
	const [hasLoadedOnce, setHasLoadedOnce] = React.useState<boolean>(false);

	const { subscribeTransactionCreated, emitTransactionCreated } = useTransactionEvents();

	const fetchTransactions = React.useCallback(
		async (page: number, perPage: number, signal?: AbortSignal): Promise<TransactionsApiResponse> => {
			const params = new URLSearchParams({
				page: String(page),
				perPage: String(perPage),
			});

			const response = await fetch(`/api/transactions?${params.toString()}`, { signal });
			let payload: unknown = null;

			try {
				payload = await response.json();
			} catch {
				payload = null;
			}

			if (!response.ok) {
				const fallback = "Error fetching transactions";
				if (payload && typeof payload === "object" && "error" in payload) {
					const errorMessage = (payload as { error?: string }).error;
					throw new Error(errorMessage ?? fallback);
				}
				throw new Error(fallback);
			}

			if (
				!payload ||
				typeof payload !== "object" ||
				!("total" in payload) ||
				!("pages" in payload)
			) {
				throw new Error("Unexpected response when fetching transactions");
			}

			const { total, pages, transactions } = payload as TransactionsApiResponse;
			return {
				total,
				pages,
				transactions: Array.isArray(transactions) ? transactions : [],
			};
		},
		[],
	);

	React.useEffect(() => {
		const controller = new AbortController();

		async function load() {
			setIsLoading(true);
			setError(null);

			try {
				const data = await fetchTransactions(pageIndex + 1, pageSize, controller.signal);
				const normalizedTransactions = data.transactions.map((transaction) =>
					deserializeTransaction(transaction),
				);

				if (controller.signal.aborted) {
					return;
				}

				setTransactions(normalizedTransactions);
				setTotalTransactions(data.total ?? normalizedTransactions.length);
				setTotalPages(data.pages ?? 0);

				const nextPageIndex = data.pages > 0 ? Math.min(pageIndex, data.pages - 1) : 0;
				if (nextPageIndex !== pageIndex) {
					setPagination((prev) => ({
						...prev,
						pageIndex: nextPageIndex,
					}));
				}
			} catch (err) {
				if (controller.signal.aborted) {
					return;
				}
				const message = err instanceof Error ? err.message : "Error fetching transactions";
				setError(message);
				setTransactions([]);
				setTotalTransactions(0);
				setTotalPages(0);
			} finally {
				if (!controller.signal.aborted) {
					setHasLoadedOnce(true);
					setIsLoading(false);
				}
			}
		}

		void load();

		return () => {
			controller.abort();
		};
	}, [pageIndex, pageSize, reloadKey, fetchTransactions]);

	React.useEffect(() => {
		return subscribeTransactionCreated(() => {
			setReloadKey((prev) => prev + 1);
			setPagination((prev) => ({
				pageIndex: 0,
				pageSize: prev.pageSize,
			}));
		});
	}, [subscribeTransactionCreated]);

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

	const handlePaginationChange = React.useCallback(
		(updater: PaginationState | ((state: PaginationState) => PaginationState)) => {
			setPagination((prev) => {
				const nextState = typeof updater === "function" ? updater(prev) : updater;
				const clampedPageIndex = Math.max(0, nextState.pageIndex);
				return {
					pageIndex: clampedPageIndex,
					pageSize: nextState.pageSize,
				};
			});
		},
		[],
	);

	const preparedData = React.useMemo<TransactionRow[]>(() => {
		return transactions.map((transaction) => ({
			...transaction,
			amountNumber: parseAmount(transaction.amount),
			bookedAtDate: toDate(transaction.bookedAt),
			createdAtDate: toDate(transaction.createdAt),
			updatedAtDate: toDate(transaction.updatedAt),
		}));
	}, [transactions]);

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

	const table = useReactTable({
		data: filteredData,
		columns,
		state: {
			sorting,
			pagination: { pageIndex, pageSize },
		},
		onSortingChange: setSorting,
		onPaginationChange: handlePaginationChange,
		manualPagination: true,
		pageCount: totalPages,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	const displayFrom = filteredData.length === 0 ? 0 : pageIndex * pageSize + 1;
	const displayTo =
		filteredData.length === 0 ? 0 : pageIndex * pageSize + filteredData.length;
	const totalRecords = totalTransactions;
	const currentPage = totalPages === 0 ? 0 : pageIndex + 1;
	const filtersApplied = selectedCurrency !== ALL_OPTION || selectedCategory !== ALL_OPTION;

	const handleTransactionCreated = React.useCallback(
		(transaction: TransactionResponse) => {
			emitTransactionCreated(transaction);
		},
		[emitTransactionCreated],
	);

	const handleRetry = React.useCallback(() => {
		setReloadKey((prev) => prev + 1);
	}, []);

	if (!hasLoadedOnce) {
		return <InitialLoadSkeleton />;
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Rows per page</span>
							<Select
								value={String(pageSize)}
								onValueChange={(value) =>
									setPagination({
										pageIndex: 0,
										pageSize: Number(value),
									})
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
				{error ? (
					<div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						<span>{error}</span>
						<Button variant="outline" size="sm" onClick={handleRetry}>
							Retry
						</Button>
					</div>
				) : null}
				<div className="text-sm text-muted-foreground">
					Showing {NUMBER_FORMATTER.format(displayFrom)} – {NUMBER_FORMATTER.format(displayTo)} of{" "}
					{NUMBER_FORMATTER.format(totalRecords)}
					{filtersApplied && totalRecords > 0 ? <> (filters applied to current page)</> : null}
					{isLoading ? <span className="ml-2 text-xs">(Updating…)</span> : null}
				</div>
			</div>

			<div className="overflow-hidden rounded-lg border px-3 py-2 sm:px-4 sm:py-3">
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
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
									Loading transactions…
								</TableCell>
							</TableRow>
						) : table.getRowModel().rows.length ? (
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
					Page {NUMBER_FORMATTER.format(currentPage)} of {NUMBER_FORMATTER.format(totalPages)}
				</div>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.setPageIndex(0)}
						disabled={isLoading || !table.getCanPreviousPage()}
						className="size-8"
					>
						<span className="sr-only">Go to first page</span>
						<IconChevronsLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.previousPage()}
						disabled={isLoading || !table.getCanPreviousPage()}
						className="size-8"
					>
						<span className="sr-only">Go to previous page</span>
						<IconChevronLeft className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.nextPage()}
						disabled={isLoading || !table.getCanNextPage()}
						className="size-8"
					>
						<span className="sr-only">Go to next page</span>
						<IconChevronRight className="size-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
						disabled={isLoading || !table.getCanNextPage()}
						className="size-8"
					>
						<span className="sr-only">Go to last page</span>
						<IconChevronsRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>
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

function deserializeTransaction(transaction: TransactionResponseLike): TransactionResponse {
	const bookedAt = toDate(transaction.bookedAt) ?? new Date(0);
	return {
		...transaction,
		bookedAt,
		createdAt: toDate(transaction.createdAt),
		updatedAt: toDate(transaction.updatedAt),
	};
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

function InitialLoadSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
						<div className="flex items-center gap-2 text-sm">
							<Skeleton className="h-4 w-24 rounded-md" />
							<Skeleton className="h-8 w-20 rounded-md" />
						</div>
						<Skeleton className="h-8 w-36 rounded-md" />
						<Skeleton className="h-8 w-40 rounded-md" />
					</div>
					<Skeleton className="h-9 w-36 rounded-md" />
				</div>
				<Skeleton className="h-4 w-52 rounded-md" />
			</div>
			<div className="overflow-hidden rounded-lg border px-3 py-2 sm:px-4 sm:py-3">
				<div className="divide-y">
					<div className="bg-muted px-4 py-3">
						<Skeleton className="h-4 w-full rounded-md" />
					</div>
					{Array.from({ length: 5 }).map((_, index) => (
						<div key={index} className="px-4 py-3">
							<Skeleton className="h-4 w-full rounded-md" />
						</div>
					))}
				</div>
			</div>
			<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<Skeleton className="h-4 w-32 rounded-md" />
				<div className="flex items-center gap-2">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-8 w-8 rounded-md" />
					))}
				</div>
			</div>
		</div>
	);
}
