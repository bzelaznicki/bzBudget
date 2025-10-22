import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getUserTransactions } from "@/db/queries/transactions"
import { Skeleton } from "@/components/ui/skeleton"
import { auth } from "@/lib/auth"

import { TransactionsTableClient } from "./data-table-client"

const DEFAULT_FETCH_LIMIT = 200

async function loadTransactions(userId: string) {
	const transactions = await getUserTransactions({
		usersId: userId,
		dateFrom: null,
		dateTo: null,
		limit: DEFAULT_FETCH_LIMIT,
		offset: 0,
		sortField: "bookedAt",
		dir: "desc",
	})

	return transactions ?? []
}

export async function DataTable() {
	const requestHeaders = await headers()
	const session = await auth.api.getSession({ headers: requestHeaders })

	if (!session) {
		redirect("/login")
	}

	const transactions = await loadTransactions(session.user.id)
	return <TransactionsTableClient data={transactions} />
}

export function DataTableSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-24 rounded-md" />
							<Skeleton className="h-8 w-20 rounded-md" />
						</div>
						<Skeleton className="h-8 w-36 rounded-md" />
						<Skeleton className="h-8 w-40 rounded-md" />
					</div>
					<Skeleton className="h-9 w-36 rounded-md" />
				</div>
				<Skeleton className="h-4 w-52 rounded-md" />
			</div>
			<div className="overflow-hidden rounded-lg border">
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
	)
}
