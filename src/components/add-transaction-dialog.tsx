"use client";

import * as React from "react";
import { IconPlus } from "@tabler/icons-react";

import type { TransactionResponse } from "@/db/queries/transactions";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";

interface AddTransactionDialogProps {
	onTransactionCreated: (transaction: TransactionResponse) => void;
}

export function AddTransactionDialog({ onTransactionCreated }: AddTransactionDialogProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<TransactionDialog
			open={open}
			onOpenChange={setOpen}
			onTransactionCreated={onTransactionCreated}
			trigger={
				<Button variant="outline" size="sm" className="gap-1.5">
					<IconPlus className="size-4" />
					Add transaction
				</Button>
			}
		/>
	);
}
