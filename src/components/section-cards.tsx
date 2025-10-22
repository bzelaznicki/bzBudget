import { Suspense, cache } from "react"

import {
	IconMinus,
	IconTrendingDown,
	IconTrendingUp,
} from "@tabler/icons-react"
import { redirect } from "next/navigation";
import { getDashboardSummary, dashboardIncomeSummary, dashboardExpensesSummary } from "@/db/queries/dashboard"
import { Badge } from "@/components/ui/badge"
import {
	Card,
	CardAction,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

type TrendDirection = "up" | "down" | "flat"

function formatCurrencyValue(amount: number, currencyCode: string) {
	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount)
	} catch {
		return amount.toFixed(2)
	}
}

function formatCurrencyWithSign(amount: number, currencyCode: string) {
	if (amount === 0) {
		return formatCurrencyValue(0, currencyCode)
	}

	const formatted = formatCurrencyValue(Math.abs(amount), currencyCode)
	const prefix = amount > 0 ? "+" : "-"
	return `${prefix}${formatted}`
}

function percentChange(
	current: number,
	previous: number,
): { label: string; direction: TrendDirection } {
	if (!Number.isFinite(current) || !Number.isFinite(previous)) {
		return { label: "—", direction: "flat" }
	}

	if (previous === 0) {
		if (current === 0) {
			return { label: "0%", direction: "flat" }
		}

		return { label: "New", direction: "up" }
	}

	const delta = ((current - previous) / Math.abs(previous)) * 100
	const decimals = Math.abs(delta) >= 10 ? 0 : 1
	const formatted = delta.toFixed(decimals)

	return {
		label: delta > 0 ? `+${formatted}%` : `${formatted}%`,
		direction: delta > 0 ? "up" : delta < 0 ? "down" : "flat",
	}
}

function absoluteChange(
	current: number,
	previous: number,
): { label: string; direction: TrendDirection } {
	const delta = current - previous

	if (delta > 0) {
		return { label: `+${delta.toLocaleString()}`, direction: "up" }
	}

	if (delta < 0) {
		return { label: `${delta.toLocaleString()}`, direction: "down" }
	}

	return { label: "0", direction: "flat" }
}

function trendIcon(direction: TrendDirection) {
	if (direction === "up") return <IconTrendingUp className="size-4" />
	if (direction === "down") return <IconTrendingDown className="size-4" />
	return <IconMinus className="size-4" />
}

function trendLabel(direction: TrendDirection, entity: string) {
	if (direction === "up") return `${entity} trending up`
	if (direction === "down") return `${entity} trending down`
	return `${entity} holding steady`
}

const loadSummary = cache(() => getDashboardSummary("demo-user"))

export async function SectionCards() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login")
	}
	return (
		<div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
			<Suspense fallback={<SummaryCardSkeleton title="Income this month" />}>
				<IncomeCard userId={session?.user.id} />
			</Suspense>
			<Suspense fallback={<SummaryCardSkeleton title="Expenses this month" />}>
				<ExpensesCard userId={session?.user.id} />
			</Suspense>
			<Suspense fallback={<SummaryCardSkeleton title="Net cash flow" />}>
				<NetCard />
			</Suspense>
			<Suspense fallback={<SummaryCardSkeleton title="Active accounts" />}>
				<AccountsCard />
			</Suspense>
		</div>
	)
}

type SummaryCardProps = {
	title: string
	value: string
	change: { label: string; direction: TrendDirection }
	footerHeadline: string
	footerSupport: string
}

function SummaryCard({
	title,
	value,
	change,
	footerHeadline,
	footerSupport,
}: SummaryCardProps) {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardDescription>{title}</CardDescription>
				<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					{value}
				</CardTitle>
				<CardAction>
					<Badge variant="outline">
						{trendIcon(change.direction)}
						{change.label}
					</Badge>
				</CardAction>
			</CardHeader>
			<CardFooter className="flex-col items-start gap-1.5 text-sm">
				<div className="line-clamp-1 flex gap-2 font-medium">
					{footerHeadline} {trendIcon(change.direction)}
				</div>
				<div className="text-muted-foreground">{footerSupport}</div>
			</CardFooter>
		</Card>
	)
}

function SummaryCardSkeleton({ title }: { title: string }) {
	return (
		<Card className="@container/card">
			<CardHeader>
				<CardDescription>{title}</CardDescription>
				<CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
					<Skeleton className="mt-2 h-8 w-32 rounded-lg @[250px]/card:w-40" />
				</CardTitle>
				<CardAction>
					<Badge
						variant="outline"
						className="flex items-center gap-2 pl-2 pr-3"
					>
						<Skeleton className="h-4 w-4 rounded-full" />
						<Skeleton className="h-4 w-12 rounded-full" />
					</Badge>
				</CardAction>
			</CardHeader>
			<CardFooter className="flex-col items-start gap-1.5 text-sm">
				<div className="line-clamp-1 flex w-full gap-2 font-medium">
					<Skeleton className="h-4 w-44 rounded-full @[250px]/card:w-56" />
				</div>
				<div className="flex w-full items-center gap-2 text-muted-foreground">
					<Skeleton className="h-3 w-36 rounded-full @[250px]/card:w-44" />
				</div>
			</CardFooter>
		</Card>
	)
}

type CardProps = {
	userId: string;
}

async function IncomeCard(props: CardProps) {
	const summary = await dashboardIncomeSummary(props.userId)
	const firstEntry = summary?.[0]

	if (!firstEntry) {
		return (
			<SummaryCard
				title="Income this month"
				value="None"
				change={{ label: "Waiting on data", direction: "flat" }}
				footerHeadline="Log your first income"
				footerSupport="Add an income transaction to view trends"
			/>
		)
	}
	const currencyCode = firstEntry.currency?.isoCode ?? "USD"
	const change = percentChange(
		firstEntry.current,
		firstEntry.previous,
	)

	return (
		<SummaryCard
			title="Income this month"
			value={formatCurrencyValue(firstEntry.current, currencyCode)}
			change={change}
			footerHeadline={trendLabel(change.direction, "Income")}
			footerSupport="Compared to last month"
		/>
	)
}

async function ExpensesCard(props: CardProps) {
	const summary = await dashboardExpensesSummary(props.userId);
	const firstEntry = summary?.[0]

	if (!firstEntry) {
		return (
			<SummaryCard
				title="Expenses this month"
				value="None"
				change={{ label: "Waiting on data", direction: "flat" }}
				footerHeadline="Log your first expense"
				footerSupport="Add an expense transaction to view trends"
			/>
		)
	}

	const currencyCode = firstEntry.currency?.isoCode ?? "USD"
	const change = percentChange(
		firstEntry.current,
		firstEntry.previous,
	)

	return (
		<SummaryCard
			title="Expenses this month"
			value={formatCurrencyValue(firstEntry.current, currencyCode)}
			change={change}
			footerHeadline={trendLabel(change.direction, "Expenses")}
			footerSupport="Compared to last month"
		/>
	)
}

async function NetCard() {
	const summary = await loadSummary()
	const currencyCode = summary.currency?.isoCode ?? "USD"
	const netDelta = summary.net.current - summary.net.previous
	const direction =
		netDelta > 0 ? "up" : netDelta < 0 ? "down" : ("flat" as TrendDirection)
	const change =
		netDelta === 0
			? {
				label: formatCurrencyValue(0, currencyCode),
				direction,
			}
			: {
				label: formatCurrencyWithSign(netDelta, currencyCode),
				direction,
			}

	return (
		<SummaryCard
			title="Net cash flow"
			value={formatCurrencyValue(summary.net.current, currencyCode)}
			change={change}
			footerHeadline={trendLabel(direction, "Cash flow")}
			footerSupport={`${summary.transactions.current.toLocaleString()} transactions logged this month`}
		/>
	)
}

async function AccountsCard() {
	const summary = await loadSummary()
	const previousAccounts = Math.max(
		summary.accounts.total - summary.accounts.newThisMonth,
		0,
	)
	const change = absoluteChange(summary.accounts.total, previousAccounts)

	return (
		<SummaryCard
			title="Active accounts"
			value={summary.accounts.total.toLocaleString()}
			change={change}
			footerHeadline={
				summary.accounts.newThisMonth > 0
					? `${summary.accounts.newThisMonth} new accounts added`
					: "No new accounts this month"
			}
			footerSupport="Linked accounts tracked in bzBudget"
		/>
	)
}
