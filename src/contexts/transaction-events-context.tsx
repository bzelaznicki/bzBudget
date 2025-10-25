"use client";

import * as React from "react";

import type { TransactionResponse } from "@/db/queries/transactions";

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
