import { Money } from "@/components/warm-ledger/primitives";
import type { CurrencyFormat } from "@/lib/format";
import { formatMoney } from "@/lib/format";

/**
 * The sidebar's standing answer to "how am I doing this month" — income minus spending,
 * with the burn-down bar underneath.
 */
export function LeftToSpendCard({
	amount,
	income,
	currency,
	daysLeft,
}: {
	amount: number;
	income: number;
	currency: CurrencyFormat;
	daysLeft: number;
}) {
	const remainingShare = income > 0 ? Math.min(Math.max(amount / income, 0), 1) : 0;

	return (
		<div className="bg-card border-border rounded-[12px] border p-3.5">
			<div className="text-eyebrow text-[11px]">Left to spend</div>
			<div className="mt-1">
				<Money amount={amount} currency={currency} className="text-[30px]" />
			</div>
			<div className="bg-sunk mt-2.5 h-1.5 overflow-hidden rounded-full">
				<div
					className="bg-income h-full rounded-full"
					style={{ width: `${(remainingShare * 100).toFixed(1)}%` }}
				/>
			</div>
			<div className="text-muted-foreground mt-1.5 text-[11.5px]">
				{daysLeft} days left
				{amount > 0 ? ` · ${formatMoney(amount / daysLeft, currency)}/day` : ""}
			</div>
		</div>
	);
}
