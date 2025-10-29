"use client";
import { useState, useMemo } from "react";
import { TransactionResponse } from "@/db/queries/transactions";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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

export async function TransactionsDataTable() {

	const [error, setError] = useState<string | null>(null);
	const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
	const [totalTransactions, setTotalTransactions] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
	const [selectedCurrency, setSelectedCurrency] = useState<string>(ALL_OPTION);
	const [totalPages, setTotalPages] = useState<number>(0);
	const [accounts, setAccounts] = useState<Record<string, string> | null>(null);
	const [perPage, setPerPage] = useState<number>(10);

	const fetchTransactions = async (page: number, perPage: number) => {
		const url = `/api/transactions?page=${page}&perPage=${perPage}`;

		try {
			const res = await fetch(url);

			if (!res.ok) {
				const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
				setError(errorBody?.error ?? "Error fetching transactions");
				return;
			}

			const body: { total: number, pages: number, transactions: TransactionResponse[] } = await res.json();


			setTransactions(body.transactions);
			setTotalPages(body.pages);
			setTotalTransactions(body.total);


		} catch (err: unknown) {
			if (err instanceof Error) {
				setError(err.message);
				return;
			}
			setError("Error fetching transactions");
		}
	}

	const currencyOptions = useMemo(() => {
		const uniqueCurrencies = new Map<string, TransactionRow["currency"]>();
		for (const transaction of preparedData) {
			if (!uniqueCurrencies.has(transaction.currency.isoCode)) {
				uniqueCurrencies.set(transaction.currency.isoCode, transaction.currency);
			}
		}
		return Array.from(uniqueCurrencies.values());
	}, [preparedData]);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Rows per page</span>
							<Select
								value={String(perPage)}
								onValueChange={(value) => {
									setPerPage(Number(value));
									setCurrentPage(1);
								}}
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
						onClick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
						className="size-8"
					>
						<span className="sr-only">Go to last page</span>
						<IconChevronsRight className="size-4" />
					</Button>
				</div>
			</div>
		</div>

	)
}
