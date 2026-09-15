import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconChevronRight, IconList } from "@tabler/icons-react";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { maskIban, StatusBadge } from "@/components/warm-ledger/account-row";
import { BalanceChart } from "@/components/warm-ledger/balance-chart";
import { EmptyHint, Money, Monogram, Panel } from "@/components/warm-ledger/primitives";
import { TransactionRow } from "@/components/warm-ledger/transaction-row";
import { getUserBankAccount } from "@/db/queries/accounts";
import { getAccountDetailFigures } from "@/db/queries/overview";
import { countUserTransactions, getUserTransactions } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { formatMoney, formatRowTimestamp, monogram } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
	ArchiveAccountButton,
	RestoreAccountButton,
} from "@/app/(authenticated)/settings/accounts/account-actions";

const RANGES = { "30d": 30, "90d": 90, "1y": 365 } as const;
type RangeKey = keyof typeof RANGES;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	year: "numeric",
});

type AccountDetailPageProps = {
	params: Promise<{ accountId: string }>;
	searchParams: Promise<{ range?: string | string[] }>;
};

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const [{ accountId }, query] = await Promise.all([params, searchParams]);
	// A malformed id would make Postgres reject the uuid comparison, so treat it as missing.
	if (!UUID_PATTERN.test(accountId)) {
		notFound();
	}

	const rangeParam = Array.isArray(query.range) ? query.range[0] : query.range;
	const range: RangeKey = rangeParam && rangeParam in RANGES ? (rangeParam as RangeKey) : "90d";
	const userId = session.user.id;

	const [account, figures, recent, transactionCount] = await Promise.all([
		getUserBankAccount(userId, accountId),
		getAccountDetailFigures(userId, accountId, RANGES[range]),
		getUserTransactions({ usersId: userId, accountId, limit: 5 }),
		countUserTransactions({ usersId: userId, accountId }),
	]);

	if (!account || !figures) {
		notFound();
	}

	const { currency } = figures;
	const net = figures.monthIn - figures.monthOut;
	const archived = account.deletedAt !== null;
	const masked = maskIban(account.iban);
	const transactionsHref = `/transactions?accountId=${account.id}`;

	return (
		<>
			<SiteHeader title="Accounts" showAddTransaction={!archived} />
			<div className="flex flex-col gap-4 px-7 py-6">
				<nav
					aria-label="Breadcrumb"
					className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]"
				>
					<Link href="/settings/accounts" className="hover:text-foreground">
						Accounts
					</Link>
					<IconChevronRight className="size-3.5" />
					<span className="text-foreground">{account.name}</span>
				</nav>

				<div className="flex flex-wrap items-start gap-4">
					<Monogram label={monogram(account.name)} className="size-13 rounded-[15px] text-[15px]" />
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2.5">
							<h2 className="text-[19px] font-semibold">{account.name}</h2>
							{archived ? (
								<StatusBadge tone="outline">Archived</StatusBadge>
							) : (
								<StatusBadge tone="neutral">Manual</StatusBadge>
							)}
						</div>
						<div className="text-muted-foreground mt-0.5 text-[13px]">
							{[masked ? `IBAN ${masked}` : null, currency.isoCode].filter(Boolean).join(" · ")}
						</div>
						<div className="mt-2.5">
							<Money
								amount={figures.balance}
								currency={currency}
								emphasis="display"
								className="text-[44px]"
							/>
						</div>
						<div
							className={cn(
								"mt-0.5 text-[13px] font-medium",
								net > 0 ? "text-income-foreground" : "text-muted-foreground",
							)}
						>
							{net === 0
								? "No movement this month"
								: `${formatMoney(net, currency, { signed: true })} this month`}
						</div>
					</div>
					<div className="flex flex-none gap-2">
						<Button asChild variant="outline" size="sm" className="rounded-[10px]">
							<Link href={transactionsHref}>
								<IconList />
								All transactions
							</Link>
						</Button>
						{archived ? (
							<RestoreAccountButton
								accountId={account.id}
								accountName={account.name}
								variant="default"
							/>
						) : null}
					</div>
				</div>

				<div className="grid items-start gap-4 lg:grid-cols-[1.55fr_1fr]">
					<div className="flex flex-col gap-3.5">
						<Panel className="px-5 pt-4.5 pb-3.5">
							<div className="mb-2.5 flex items-center justify-between">
								<span className="text-[13.5px] font-semibold">Balance · {range}</span>
								<div
									className="bg-sunk flex gap-1 rounded-[9px] p-[3px]"
									role="group"
									aria-label="Range"
								>
									{(Object.keys(RANGES) as RangeKey[]).map((key) => (
										<Link
											key={key}
											href={`?range=${key}`}
											scroll={false}
											aria-current={key === range ? "true" : undefined}
											className={cn(
												"rounded-[7px] px-2.5 py-1 text-[11.5px]",
												key === range
													? "bg-card font-medium"
													: "text-muted-foreground hover:text-foreground",
											)}
										>
											{key}
										</Link>
									))}
								</div>
							</div>
							{transactionCount === 0 ? (
								<EmptyHint>
									Log a transaction on this account and its balance will chart here.
								</EmptyHint>
							) : (
								<BalanceChart
									series={figures.series}
									label={`${account.name} balance over the last ${range}`}
								/>
							)}
						</Panel>

						<Panel className="px-5 pt-1.5 pb-2.5">
							<div className="flex items-center justify-between pt-3 pb-1.5">
								<span className="text-[13.5px] font-semibold">Recent activity</span>
								{transactionCount > 0 ? (
									<Link
										href={transactionsHref}
										className="text-income-foreground text-[12.5px] font-medium hover:underline"
									>
										See all {transactionCount}
									</Link>
								) : null}
							</div>
							{recent && recent.length > 0 ? (
								recent.map((transaction) => {
									const magnitude = Number(transaction.amount);
									return (
										<TransactionRow
											key={transaction.id}
											className="border-border border-t py-2.5"
											row={{
												id: transaction.id,
												counterparty: transaction.counterparty,
												support: formatRowTimestamp(transaction.bookedAt),
												category: transaction.category?.name ?? null,
												amount: transaction.type === "incoming" ? magnitude : -magnitude,
												currency: transaction.currency,
											}}
										/>
									);
								})
							) : (
								<EmptyHint>Nothing logged on this account yet.</EmptyHint>
							)}
						</Panel>
					</div>

					<div className="flex flex-col gap-3.5">
						<Panel className="flex flex-col gap-3 px-5 py-4.5">
							<span className="text-[13.5px] font-semibold">This month</span>
							<FigureLine label="Money in">
								<span className="text-numeric text-income-foreground text-[13.5px]">
									{formatMoney(figures.monthIn, currency, { signed: true })}
								</span>
							</FigureLine>
							<FigureLine label="Money out">
								<span className="text-numeric text-[13.5px]">
									{formatMoney(-figures.monthOut, currency, { signed: figures.monthOut !== 0 })}
								</span>
							</FigureLine>
							<div className="bg-border h-px" />
							<FigureLine label="Net" strong>
								<span className="text-numeric text-sm font-medium">
									{formatMoney(net, currency, { signed: net !== 0 })}
								</span>
							</FigureLine>
						</Panel>

						<Panel className="flex flex-col gap-3 px-5 py-4.5">
							<span className="text-[13.5px] font-semibold">Account details</span>
							<FigureLine label="Type">Manual</FigureLine>
							<FigureLine label="Currency">{currency.isoCode}</FigureLine>
							<FigureLine label="IBAN">{masked ?? "Not set"}</FigureLine>
							<FigureLine label="Transactions">{transactionCount}</FigureLine>
							{account.createdAt ? (
								<FigureLine label="Added">{DATE_FORMATTER.format(account.createdAt)}</FigureLine>
							) : null}
						</Panel>

						{archived ? null : (
							<div className="bg-sunk/50 border-border flex flex-col gap-2.5 rounded-xl border px-5 py-4">
								<span className="text-[13.5px] font-semibold">Careful zone</span>
								<p className="text-secondary-foreground text-xs leading-snug">
									Archiving keeps the history but hides the account from your list and pickers.
								</p>
								<div>
									<ArchiveAccountButton
										accountId={account.id}
										accountName={account.name}
										transactionCount={transactionCount}
									/>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

function FigureLine({
	label,
	strong = false,
	children,
}: {
	label: string;
	strong?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-baseline justify-between gap-4">
			<span className={cn("text-[12.5px]", strong ? "font-medium" : "text-secondary-foreground")}>
				{label}
			</span>
			<span className="text-[12.5px]">{children}</span>
		</div>
	);
}
