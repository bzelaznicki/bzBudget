import type { Icon } from "@tabler/icons-react";

import { Money, Panel } from "@/components/warm-ledger/primitives";
import type { CurrencyFormat } from "@/lib/format";

/**
 * The small serif figures flanking the net-worth hero — income, spending, and friends.
 */
export function StatCard({
	label,
	amount,
	currency,
	support,
	icon: StatIcon,
	accent = "muted",
}: {
	label: string;
	amount: number;
	currency: CurrencyFormat;
	support: string;
	icon: Icon;
	accent?: "income" | "clay" | "muted";
}) {
	const accentClass =
		accent === "income"
			? "text-income-foreground"
			: accent === "clay"
				? "text-clay-foreground"
				: "text-muted-foreground";

	return (
		<Panel className="px-5 py-4.5">
			<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
				<StatIcon className={`size-4 ${accentClass}`} />
				{label}
			</div>
			<div className="mt-2">
				<Money amount={amount} currency={currency} className="text-3xl" />
			</div>
			<div className="text-muted-foreground mt-1 text-xs">{support}</div>
		</Panel>
	);
}
