import { SiteHeader } from "@/components/site-header";
import { DataTable, DataTableSkeleton } from "@/components/data-table";
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

			<Suspense fallback={<DataTableSkeleton />}>
				<DataTable />
			</Suspense>
		</>
	)
}
