import { getUserTransactions, countUserTransactions } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

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


export async function TransactionsDataTable() {
	const requestHeaders = await headers();
	const session = await auth.api.getSession({ headers: requestHeaders })

	if (!session) redirect("/login");

	const transactions = await fetchTransactions(session.user.id);
	const transactionCount = await fetchTransactionCount(session.user.id);


}
