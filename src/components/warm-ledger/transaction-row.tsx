import { Amount, CategoryChip, Monogram } from "@/components/warm-ledger/primitives";
import type { CurrencyFormat } from "@/lib/format";
import { monogram } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LedgerRow = {
	id: string;
	counterparty: string;
	/** Time and account, or note and account — whatever the surrounding screen shows. */
	support: string;
	category: string | null;
	amount: number;
	currency: CurrencyFormat;
};

/**
 * One transaction line, shared by the overview's "Recent activity" card and the
 * day-grouped transactions list.
 */
export function TransactionRow({ row, className }: { row: LedgerRow; className?: string }) {
	return (
		<div className={cn("flex items-center gap-3.5", className)}>
			<Monogram label={monogram(row.counterparty)} />
			<div className="min-w-0 flex-1 leading-tight">
				<div className="truncate text-[13.5px] font-medium">{row.counterparty}</div>
				<div className="text-muted-foreground truncate text-[11.5px]">{row.support}</div>
			</div>
			{row.category ? <CategoryChip>{row.category}</CategoryChip> : null}
			<Amount
				amount={row.amount}
				currency={row.currency}
				className="w-[110px] flex-none text-right"
			/>
		</div>
	);
}
