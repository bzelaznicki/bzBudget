import { IconArrowDownLeft, IconArrowUpRight, IconWallet } from "@tabler/icons-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { BudgetRingsCard } from "@/components/warm-ledger/budget-rings-card";
import { NetWorthCard } from "@/components/warm-ledger/net-worth-card";
import { RecentActivityCard } from "@/components/warm-ledger/recent-activity-card";
import { SpendBreakdownCard } from "@/components/warm-ledger/spend-breakdown-card";
import { StatCard } from "@/components/warm-ledger/stat-card";
import type { LedgerRow } from "@/components/warm-ledger/transaction-row";
import { getUserBankAccounts } from "@/db/queries/accounts";
import { getTopBudgetsByUtilization } from "@/db/queries/budgets";
import { dashboardExpensesSummary, dashboardIncomeSummary } from "@/db/queries/dashboard";
import {
	getCategorySpendBreakdown,
	getNetWorthSeries,
	getPrimaryCurrency,
	pickCurrencyRow,
} from "@/db/queries/overview";
import { countUserTransactions, getUserTransactions } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { daysRemainingInMonth, formatMoney, formatPercent, formatRowTimestamp } from "@/lib/format";

export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const userId = session.user.id;
	const currency = await getPrimaryCurrency(userId);

	const [netWorth, breakdown, budgets, income, expenses, recent, accounts, transactionCount] =
		await Promise.all([
			getNetWorthSeries(userId, 12, currency),
			getCategorySpendBreakdown(userId, 4, currency),
			getTopBudgetsByUtilization(userId, 4),
			dashboardIncomeSummary(userId),
			dashboardExpensesSummary(userId),
			getUserTransactions({ usersId: userId, limit: 5 }),
			getUserBankAccounts(userId, 100, 0),
			countUserTransactions({ usersId: userId }),
		]);

	const incomeEntry = pickCurrencyRow(income, currency);
	const expensesEntry = pickCurrencyRow(expenses, currency);
	const incomeTotal = incomeEntry?.current ?? 0;
	const expensesTotal = expensesEntry?.current ?? 0;
	const leftToSpend = incomeTotal - expensesTotal;
	const daysLeft = daysRemainingInMonth();

	const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]));

	const recentRows: LedgerRow[] = (recent ?? []).map((transaction) => {
		const magnitude = Number(transaction.amount);
		const signed = transaction.type === "incoming" ? magnitude : -magnitude;
		const account = accountNames.get(transaction.accountsId);

		return {
			id: transaction.id,
			counterparty: transaction.counterparty,
			support: [formatRowTimestamp(new Date(transaction.bookedAt)), account]
				.filter(Boolean)
				.join(" · "),
			category: transaction.category?.name ?? null,
			amount: signed,
			currency: transaction.currency,
		};
	});

	const comparison = (current: number, previous: number) => {
		if (previous === 0) return "No comparable month";
		return `${formatPercent(((current - previous) / Math.abs(previous)) * 100)} vs last month`;
	};

	return (
		<>
			<SiteHeader title="Overview" />
			<div className="flex flex-col gap-4.5 px-7 py-6">
				<div className="grid gap-4.5 lg:grid-cols-[1.35fr_1fr]">
					<NetWorthCard series={netWorth} />

					<div className="flex flex-col gap-4.5">
						<div className="grid gap-4.5 sm:grid-cols-2">
							<StatCard
								label="Income"
								amount={incomeTotal}
								currency={currency}
								support={comparison(incomeTotal, incomeEntry?.previous ?? 0)}
								icon={IconArrowDownLeft}
								accent="income"
							/>
							<StatCard
								label="Spending"
								amount={expensesTotal}
								currency={currency}
								support={comparison(expensesTotal, expensesEntry?.previous ?? 0)}
								icon={IconArrowUpRight}
								accent="clay"
							/>
						</div>
						<SpendBreakdownCard breakdown={breakdown} />
					</div>
				</div>

				<div className="grid gap-4.5 lg:grid-cols-2">
					<BudgetRingsCard budgets={budgets ?? []} />
					<StatCard
						label="Left to spend"
						amount={leftToSpend}
						currency={currency}
						support={
							leftToSpend > 0
								? `${formatMoney(leftToSpend / daysLeft, currency)}/day for ${daysLeft} days`
								: `${daysLeft} days remaining this month`
						}
						icon={IconWallet}
						accent={leftToSpend > 0 ? "income" : "muted"}
					/>
				</div>

				<RecentActivityCard rows={recentRows} totalCount={transactionCount} />
			</div>
		</>
	);
}
