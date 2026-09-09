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

/** The four-up ring summary on the overview. */
export function BudgetRingsCard({ budgets }: { budgets: BudgetWithSpending[] }) {
	const onTrack = budgets.filter((budget) => !budget.isOverBudget && !budget.isThresholdReached);

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
					{budgets.slice(0, 4).map((budget) => {
						const percentage = budget.utilizationPercentage;

						return (
							<div key={budget.id} className="flex flex-col items-center gap-2">
								<ProgressRing
									percentage={percentage}
									color={budgetStateColor(budgetState(percentage))}
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
		</Panel>
	);
}
