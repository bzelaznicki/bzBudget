"use client"

import * as React from "react"
import {
	type Column,
	ColumnDef,
	SortingState,
	flexRender,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table"
import {
	IconArrowsSort,
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconChevronUp,
	IconChevronsLeft,
	IconChevronsRight,
	IconPlus,
} from "@tabler/icons-react"

import type { TransactionResponse } from "@/db/queries/transactions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type TransactionRow = TransactionResponse & {
	amountNumber: number
	bookedAtDate: Date | null
	createdAtDate: Date | null
	updatedAtDate: Date | null
}

const PAGE_SIZE_OPTIONS = ["10", "20", "50"]
const ALL_OPTION = "all"
const UNCATEGORIZED_OPTION = "uncategorized"

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
]

export function TransactionsTableClient({ data }: { data: TransactionResponse[] }) {
	const preparedData = React.useMemo<TransactionRow[]>(() => {
		return data.map((transaction) => ({
			...transaction,
			amountNumber: parseAmount(transaction.amount),
			bookedAtDate: toDate(transaction.bookedAt),
			createdAtDate: toDate(transaction.createdAt),
			updatedAtDate: toDate(transaction.updatedAt),
		}))
	}, [data])

	const [selectedCurrency, setSelectedCurrency] = React.useState<string>(ALL_OPTION)
	const [selectedCategory, setSelectedCategory] =
		React.useState<string>(ALL_OPTION)
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: "bookedAt", desc: true },
	])
	const [{ pageIndex, pageSize }, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: Number(PAGE_SIZE_OPTIONS[0]),
	})

	const currencyOptions = React.useMemo(() => {
		const uniqueCurrencies = new Map<string, TransactionRow["currency"]>()
		for (const transaction of preparedData) {
			if (!uniqueCurrencies.has(transaction.currency.isoCode)) {
				uniqueCurrencies.set(transaction.currency.isoCode, transaction.currency)
			}
		}
		return Array.from(uniqueCurrencies.values())
	}, [preparedData])

	const categoryOptions = React.useMemo(() => {
		const uniqueCategories = new Map<
			string,
			{ id: string; name: string; isUncategorized: boolean }
		>()
		for (const transaction of preparedData) {
			if (transaction.category) {
				if (!uniqueCategories.has(transaction.category.id)) {
					uniqueCategories.set(transaction.category.id, {
						id: transaction.category.id,
						name: transaction.category.name,
						isUncategorized: false,
					})
				}
			} else if (!uniqueCategories.has(UNCATEGORIZED_OPTION)) {
				uniqueCategories.set(UNCATEGORIZED_OPTION, {
					id: UNCATEGORIZED_OPTION,
					name: "Uncategorized",
					isUncategorized: true,
				})
			}
		}
		return Array.from(uniqueCategories.values())
	}, [preparedData])

	React.useEffect(() => {
		setPagination((prev) => {
			if (prev.pageIndex === 0) {
				return prev
			}
			return {
				...prev,
				pageIndex: 0,
			}
		})
	}, [selectedCurrency, selectedCategory])

	const filteredData = React.useMemo(() => {
		return preparedData.filter((transaction) => {
			const matchesCurrency =
				selectedCurrency === ALL_OPTION ||
				transaction.currency.isoCode === selectedCurrency

			const matchesCategory =
				selectedCategory === ALL_OPTION ||
				(selectedCategory === UNCATEGORIZED_OPTION
					? !transaction.category
					: transaction.category?.id === selectedCategory)

			return matchesCurrency && matchesCategory
		})
	}, [preparedData, selectedCurrency, selectedCategory])

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
	})

	const totalRecords = preparedData.length
	const totalRows = table.getPrePaginationRowModel().rows.length
	const displayFrom =
		totalRows === 0 ? 0 : pageIndex * pageSize + 1
	const displayTo = Math.min(totalRows, (pageIndex + 1) * pageSize)
	const currentPage = table.getPageCount() === 0 ? 0 : pageIndex + 1

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
									setPagination((prev) => ({
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
							<Select
								value={selectedCurrency}
								onValueChange={setSelectedCurrency}
							>
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
											<CurrencyBadge
												symbol={currency.symbol}
												isoCode={currency.isoCode}
											/>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Category</span>
							<Select
								value={selectedCategory}
								onValueChange={setSelectedCategory}
							>
								<SelectTrigger className="h-8 w-[11rem]">
									<SelectValue placeholder="All categories" />
								</SelectTrigger>
								<SelectContent align="start">
									<SelectItem value={ALL_OPTION}>All categories</SelectItem>
									{categoryOptions.map((category) => (
										<SelectItem
											key={category.id}
											value={category.id}
										>
											{category.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<Button variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
						<IconPlus className="size-4" />
						Add transaction
					</Button>
				</div>
				<div className="text-sm text-muted-foreground">
					Showing {displayFrom.toLocaleString()} – {displayTo.toLocaleString()} of{" "}
					{totalRows.toLocaleString()}
					{(selectedCurrency !== ALL_OPTION ||
						selectedCategory !== ALL_OPTION) &&
					totalRecords > 0 ? (
						<>
							{" "}
							(filtered from {totalRecords.toLocaleString()})
						</>
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
					Page {currentPage.toLocaleString()} of {table.getPageCount().toLocaleString()}
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

function SortableHeader({
	column,
	label,
	align = "left",
}: {
	column: Column<TransactionRow, unknown>
	label: string
	align?: "left" | "right"
}) {
	const sorted = column.getIsSorted()
	const alignmentClasses =
		align === "right" ? "ml-auto -mr-2 justify-end" : "-ml-3 justify-start"

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
	)
}

function toDate(value: Date | string | null): Date | null {
	if (!value) return null
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value
	}
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

function parseAmount(amount: string | null): number {
	if (!amount) return 0
	const parsed = Number(amount)
	return Number.isFinite(parsed) ? parsed : 0
}

function formatAmount(amount: number, currency: TransactionResponse["currency"]) {
	if (!Number.isFinite(amount) || !currency) return "—"

	try {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency.isoCode ?? "USD",
		})
		return formatter.format(amount)
	} catch {
		const fallbackSymbol = currency.symbol ?? currency.isoCode
		const formatted = amount.toLocaleString(undefined, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})
		return currency.position === "before"
			? `${fallbackSymbol}${formatted}`
			: `${formatted}${fallbackSymbol}`
	}
}

function CurrencyBadge({
	symbol,
	isoCode,
}: {
	symbol: string | null
	isoCode: string
}) {
	const displaySymbol = symbol ?? isoCode
	return (
		<Badge variant="outline" className="gap-1">
			<span>{displaySymbol}</span>
			<span className="text-muted-foreground text-xs uppercase">{isoCode}</span>
		</Badge>
	)
}

function formatDateTime(date: Date | null) {
	if (!date) return "—"
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}
