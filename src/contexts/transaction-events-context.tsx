"use client";

import * as React from "react";

import type { TransactionResponse } from "@/db/queries/transactions";
import { POSTHOG_ENABLED, posthog } from "@/instrumentation-client";

type TransactionListener = (transaction: TransactionResponse) => void;

type TransactionEventsContextValue = {
	emitTransactionCreated: (transaction: TransactionResponse) => void;
	subscribeTransactionCreated: (listener: TransactionListener) => () => void;
};

const TransactionEventsContext = React.createContext<TransactionEventsContextValue | null>(null);

export function TransactionEventsProvider({ children }: { children: React.ReactNode }) {
	const listenersRef = React.useRef(new Set<TransactionListener>());

	const subscribeTransactionCreated = React.useCallback((listener: TransactionListener) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	const emitTransactionCreated = React.useCallback((transaction: TransactionResponse) => {
		if (POSTHOG_ENABLED) {
			const amount = Number(transaction.amount);
			posthog.capture("transaction_created", {
				transactionId: transaction.id,
				accountId: transaction.accountsId,
				amount: Number.isFinite(amount) ? amount : undefined,
				currency: transaction.currency?.isoCode,
				categoryId: transaction.categoriesId,
				hasCategory: Boolean(transaction.categoriesId),
				externalId: transaction.externalId,
				type: transaction.type,
			});
		}

		for (const listener of listenersRef.current) {
			listener(transaction);
		}
	}, []);

	const value = React.useMemo(
		() => ({
			emitTransactionCreated,
			subscribeTransactionCreated,
		}),
		[emitTransactionCreated, subscribeTransactionCreated],
	);

	return (
		<TransactionEventsContext.Provider value={value}>{children}</TransactionEventsContext.Provider>
	);
}

export function useTransactionEvents() {
	const context = React.useContext(TransactionEventsContext);
	if (!context) {
		throw new Error("useTransactionEvents must be used within TransactionEventsProvider");
	}
	return context;
}
