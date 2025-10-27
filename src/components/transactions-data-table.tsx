"use client";
import { useState } from "react";
import { TransactionResponse } from "@/db/queries/transactions";

export async function TransactionsDataTable() {

	const [error, setError] = useState<string | null>(null);
	const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
	const [totalTransactions, setTotalTransactions] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState<number>(1);
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

	return (
		<>

		</>
	)
}
