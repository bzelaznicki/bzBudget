import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { SiteHeader } from "@/components/site-header";
import {
	AccountRow,
	AccountsEmptyState,
	AddAccountRow,
	ArchivedAccountRow,
} from "@/components/warm-ledger/account-row";
import { Eyebrow, Money } from "@/components/warm-ledger/primitives";
import { getArchivedBankAccounts } from "@/db/queries/accounts";
import { listCurrencies } from "@/db/queries/currencies";
import { getAccountBalances, getPrimaryCurrency } from "@/db/queries/overview";
import { auth } from "@/lib/auth";
import { RestoreAccountButton } from "@/app/(authenticated)/settings/accounts/account-actions";
import {
	AddAccountButton,
	AddAccountDialog,
} from "@/app/(authenticated)/settings/accounts/add-account-dialog";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default async function AccountsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const [primaryCurrency, currencies, balances, archived] = await Promise.all([
		getPrimaryCurrency(session.user.id),
		listCurrencies(),
		getAccountBalances(session.user.id),
		getArchivedBankAccounts(session.user.id),
	]);

	// Only accounts held in the primary currency roll up into the headline — bzBudget has
	// no FX rates yet, so mixing currencies here would produce a meaningless number.
	const headlineTotal = balances
		.filter((entry) => entry.currency.isoCode === primaryCurrency.isoCode)
		.reduce((sum, entry) => sum + entry.balance, 0);
	const currencyCount = new Set(balances.map((entry) => entry.currency.isoCode)).size;

	return (
		<>
			<SiteHeader
				title="Accounts"
				showAddTransaction={false}
				actions={
					balances.length > 0 ? (
						<AddAccountDialog currencies={currencies} trigger={<AddAccountButton />} />
					) : null
				}
			/>
			<div className="flex flex-col gap-4.5 px-7 py-6">
				{balances.length === 0 ? (
					<AccountsEmptyState
						hasArchived={archived.length > 0}
						action={
							<AddAccountDialog
								currencies={currencies}
								trigger={<AddAccountButton size="default" className="rounded-[11px]" />}
							/>
						}
					/>
				) : (
					<>
						<div>
							<Eyebrow>Accounts</Eyebrow>
							<div className="mt-1">
								<Money
									amount={headlineTotal}
									currency={primaryCurrency}
									emphasis="display"
									className="text-[40px]"
								/>
							</div>
							<div className="text-muted-foreground mt-1 text-[13px]">
								{`${balances.length} ${balances.length === 1 ? "account" : "accounts"} · ${currencyCount} ${
									currencyCount === 1 ? "currency" : "currencies"
								}`}
								{currencyCount > 1
									? ` · total counts ${primaryCurrency.isoCode} accounts only`
									: ""}
							</div>
						</div>

						<div className="flex flex-col gap-2.5">
							{balances.map((account) => (
								<AccountRow
									key={account.id}
									href={`/settings/accounts/${account.id}`}
									name={account.name}
									iban={account.iban}
									balance={account.balance}
									monthChange={account.monthChange}
									currency={account.currency}
									isPrimaryCurrency={account.currency.isoCode === primaryCurrency.isoCode}
								/>
							))}
							<AddAccountDialog
								currencies={currencies}
								trigger={
									<AddAccountRow>
										<IconPlus className="size-4" />
										Add an account
									</AddAccountRow>
								}
							/>
						</div>
					</>
				)}

				{archived.length > 0 ? (
					<section className="flex flex-col gap-2.5">
						<Eyebrow className="mt-2">Archived</Eyebrow>
						{archived.map((account) => (
							<ArchivedAccountRow
								key={account.id}
								href={`/settings/accounts/${account.id}`}
								name={account.name}
								archivedOn={account.deletedAt ? DATE_FORMATTER.format(account.deletedAt) : ""}
								action={<RestoreAccountButton accountId={account.id} accountName={account.name} />}
							/>
						))}
					</section>
				) : null}
			</div>
		</>
	);
}
