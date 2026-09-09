import Link from "next/link";

import {
	EmptyHint,
	Panel,
	PanelHeader,
	ProgressRing,
	budgetState,
	budgetStateColor,
} from "@/components/warm-ledger/primitives";
import type { BudgetWithSpending } from "@/db/queries/budgets";

/** How many rings fit across the card before it stops being readable. */
const RINGS_SHOWN = 4;

/**
 * The ring summary on the overview.
 *
 * Takes every budget, not a pre-truncated slice: the on-track count describes all of them,
 * so it agrees with the budgets page, while only the busiest few get a ring.
 */
export function BudgetRingsCard({ budgets }: { budgets: BudgetWithSpending[] }) {
	const onTrack = budgets.filter((budget) => !budget.isOverBudget && !budget.isThresholdReached);
	const busiest = [...budgets]
		.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage)
		.slice(0, RINGS_SHOWN);
	const hidden = budgets.length - busiest.length;

	return (
		<Panel className="p-5">
			<PanelHeader
				title="Budgets"
				aside={budgets.length > 0 ? `${onTrack.length} of ${budgets.length} on track` : undefined}
				className="mb-4"
			/>

			{budgets.length === 0 ? (
				<EmptyHint>
					<Link href="/settings/budgets" className="text-income-foreground font-medium">
						Set your first budget
					</Link>{" "}
					to track spending against a limit.
				</EmptyHint>
			) : (
				<div className="grid grid-cols-4 gap-2.5">
					{busiest.map((budget) => {
						const percentage = budget.utilizationPercentage;

						return (
							<div key={budget.id} className="flex flex-col items-center gap-2">
								<ProgressRing
									percentage={percentage}
									color={budgetStateColor(budgetState(budget))}
								/>
								<div className="text-center leading-tight">
									<div className="truncate text-[11.5px] font-medium">
										{budget.category?.name ?? "Overall"}
									</div>
									<div className="text-muted-foreground text-[11px]">{percentage.toFixed(0)}%</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{hidden > 0 ? (
				<Link
					href="/settings/budgets"
					className="text-muted-foreground hover:text-foreground mt-3.5 block text-[11.5px]"
				>
					+{hidden} more
				</Link>
			) : null}
		</Panel>
	);
}
