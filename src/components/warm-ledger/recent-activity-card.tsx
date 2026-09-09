import Link from "next/link";

import { EmptyHint, Panel } from "@/components/warm-ledger/primitives";
import { type LedgerRow, TransactionRow } from "@/components/warm-ledger/transaction-row";

export function RecentActivityCard({
	rows,
	totalCount,
}: {
	rows: LedgerRow[];
	totalCount: number;
}) {
	return (
		<Panel className="px-6 py-5">
			<div className="mb-1.5 flex items-center justify-between">
				<span className="text-sm font-semibold">Recent activity</span>
				<Link
					href="/transactions"
					className="text-income-foreground text-[12.5px] font-medium hover:underline"
				>
					{totalCount > 0 ? `See all ${totalCount}` : "See all"}
				</Link>
			</div>

			{rows.length === 0 ? (
				<EmptyHint>Nothing logged yet — add a transaction to get started.</EmptyHint>
			) : (
				rows.map((row) => (
					<TransactionRow key={row.id} row={row} className="border-border border-t py-2.5" />
				))
			)}
		</Panel>
	);
}
