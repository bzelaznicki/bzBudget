import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Eyebrow, Money, Panel } from "@/components/warm-ledger/primitives";
import { listBudgetsWithSpending } from "@/db/queries/budgets";
import { listUserCategories } from "@/db/queries/categories";
import { getPrimaryCurrency } from "@/db/queries/overview";
import { auth } from "@/lib/auth";
import { daysRemainingInMonth, formatMoney } from "@/lib/format";
import { BudgetsList } from "./budgets-list";
import { CreateBudgetForm } from "./create-budget-form";

export default async function BudgetsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const currency = await getPrimaryCurrency(session.user.id);
	const [budgets, categories] = await Promise.all([
		listBudgetsWithSpending(session.user.id),
		listUserCategories(session.user.id),
	]);

	const budgetList = budgets ?? [];

	// The headline is about this month, so weekly and yearly budgets stay out of it —
	// folding a yearly limit into a monthly total would badly overstate what's allocated.
	// Their cards still appear below, each labelled with its own period.
	const monthly = budgetList.filter((budget) => budget.period === "monthly");
	const spent = monthly.reduce((sum, budget) => sum + budget.currentSpending, 0);
	const allocated = monthly.reduce((sum, budget) => sum + Number(budget.amount), 0);
	const onTrack = monthly.filter(
		(budget) => !budget.isOverBudget && !budget.isThresholdReached,
	).length;
	const otherPeriods = budgetList.length - monthly.length;

	return (
		<>
			<SiteHeader title="Budgets" />
			<div className="flex flex-col gap-4.5 px-7 py-6">
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<Eyebrow>This month&apos;s budgets</Eyebrow>
						<div className="mt-1 text-[40px] leading-tight">
							<Money amount={spent} currency={currency} className="text-[40px]" />
							<span className="text-money text-muted-foreground text-[40px]">
								{" "}
								of {formatMoney(allocated, currency)}
							</span>
						</div>
						<div className="text-muted-foreground mt-1 text-[13px]">
							{monthly.length === 0
								? budgetList.length === 0
									? "No budgets set yet"
									: "No monthly budgets set yet"
								: `${onTrack} of ${monthly.length} on track · ${daysRemainingInMonth()} days remaining`}
							{otherPeriods > 0 ? ` · ${otherPeriods} on another period, shown below` : ""}
						</div>
					</div>
				</div>

				<BudgetsList budgets={budgetList} currency={currency} />

				<Panel className="px-5.5 py-5">
					<h2 className="mb-1 text-sm font-semibold">New budget</h2>
					<p className="text-muted-foreground mb-4 text-[12.5px]">
						Set a limit for a category or your overall spending, and choose when to be warned.
					</p>
					<CreateBudgetForm categories={categories} />
				</Panel>
			</div>
		</>
	);
}
