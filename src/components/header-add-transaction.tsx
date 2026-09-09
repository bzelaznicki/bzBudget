"use client";

import { useCallback, useState } from "react";
import { IconPlus } from "@tabler/icons-react";

import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import { useTransactionEvents } from "@/contexts/transaction-events-context";
import type { TransactionResponse } from "@/db/queries/transactions";
import { captureClientEvent } from "@/instrumentation-client";

/**
 * The top bar's primary action. In Warm Ledger the primary button is ink, not emerald —
 * emerald stays reserved for meaning.
 */
export function HeaderAddTransaction() {
	const [open, setOpen] = useState(false);
	const { emitTransactionCreated } = useTransactionEvents();

	const onTransactionCreated = useCallback(
		(transaction: TransactionResponse) => {
			emitTransactionCreated(transaction);
		},
		[emitTransactionCreated],
	);

	return (
		<TransactionDialog
			open={open}
			onOpenChange={setOpen}
			onTransactionCreated={onTransactionCreated}
			trigger={
				<Button
					size="sm"
					className="h-8 gap-1.5 rounded-[9px] text-[13px]"
					onClick={() => captureClientEvent("quick_create_opened")}
				>
					<IconPlus className="size-4" />
					Add transaction
				</Button>
			}
		/>
	);
}
