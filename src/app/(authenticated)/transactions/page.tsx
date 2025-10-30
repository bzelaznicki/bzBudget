import { SiteHeader } from "@/components/site-header";
import { TransactionsDataTable } from "@/components/transactions-data-table";
import { DataTableSkeleton } from "@/components/data-table";
import { Suspense } from "react";
import { getUserTransactions, countUserTransactions } from "@/db/queries/transactions";

async function fetchTransactions(userId: string, dateFrom?: Date, dateTo?: Date) {
	const transactions = await getUserTransactions({
		usersId: userId,
		dateFrom: dateFrom,
		dateTo: dateTo,
	});

	return transactions ?? [];
}

async function fetchTransactionCount(userId: string, dateFrom?: Date, dateTo?: Date) {

	const transactionCount = await countUserTransactions({
		usersId: userId,
		dateFrom,
		dateTo,
	});

	return transactionCount;
}

export default function TransactionsPage() {
	return (
		<>
			<SiteHeader title="Transactions" />
			<div className="mx-auto mt-6 w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
				<Suspense fallback={<DataTableSkeleton />}>
					<TransactionsDataTable />
				</Suspense>
			</div>
		</>
	);
}
