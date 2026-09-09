import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { TransactionsLedger } from "@/components/transactions-ledger";
import { getUserBankAccounts } from "@/db/queries/accounts";
import { dashboardExpensesSummary, dashboardIncomeSummary } from "@/db/queries/dashboard";
import { getPrimaryCurrency, pickCurrencyRow } from "@/db/queries/overview";
import { countUserTransactions } from "@/db/queries/transactions";
import { auth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

export default async function TransactionsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const userId = session.user.id;
	const currency = await getPrimaryCurrency(userId);

	const [accounts, count, income, expenses] = await Promise.all([
		getUserBankAccounts(userId, 100, 0),
		countUserTransactions({ usersId: userId }),
		dashboardIncomeSummary(userId),
		dashboardExpensesSummary(userId),
	]);

	const outgoing = pickCurrencyRow(expenses, currency)?.current ?? 0;
	const incoming = pickCurrencyRow(income, currency)?.current ?? 0;

	const accountNames = Object.fromEntries(
		(accounts ?? []).map((account) => [account.id, account.name]),
	);

	return (
		<>
			<SiteHeader
				title="Transactions"
				summary={`${count} in total · ${formatMoney(outgoing, currency)} out, ${formatMoney(
					incoming,
					currency,
				)} in this month`}
			/>
			<div className="px-7 py-5.5">
				<TransactionsLedger accountNames={accountNames} />
			</div>
		</>
	);
}
