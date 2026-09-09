import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eyebrow, Money, Panel } from "@/components/warm-ledger/primitives";
import type { BankAccountResponse } from "@/db/queries/accounts";
import { createBankAccount, getUserBankAccounts } from "@/db/queries/accounts";
import { listCurrencies } from "@/db/queries/currencies";
import { getAccountBalances, getPrimaryCurrency } from "@/db/queries/overview";
import { auth } from "@/lib/auth";
import { AccountsList } from "./accounts-list";
import { CurrencyPicker } from "./currency-picker";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

function formatAccountDate(value: Date | null): string {
	if (!value) return "Unknown";
	return DATE_FORMATTER.format(value);
}

async function createAccountAction(formData: FormData) {
	"use server";

	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const name = formData.get("name");
	const currencyId = formData.get("currencyId");
	const iban = formData.get("iban");

	const safeName = typeof name === "string" ? name.trim() : "";
	const safeCurrencyId = typeof currencyId === "string" ? currencyId.trim() : "";
	const safeIban = typeof iban === "string" && iban.trim().length > 0 ? iban.trim() : undefined;

	if (!safeName || !safeCurrencyId) {
		revalidatePath("/settings/accounts");
		return;
	}

	await createBankAccount(session.user.id, safeName, safeCurrencyId, safeIban);
	revalidatePath("/settings/accounts");
}

export default async function AccountsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const primaryCurrency = await getPrimaryCurrency(session.user.id);
	const [accounts, currencies, balances] = await Promise.all([
		getUserBankAccounts(session.user.id, 50, 0),
		listCurrencies(),
		getAccountBalances(session.user.id),
	]);

	const accountsList: BankAccountResponse[] = accounts ?? [];
	const serializedAccounts = accountsList.map((account) => ({
		...account,
		createdAt: account.createdAt ? account.createdAt.toISOString() : null,
		updatedAt: account.updatedAt ? account.updatedAt.toISOString() : null,
		deletedAt: account.deletedAt ? account.deletedAt.toISOString() : null,
		createdAtDisplay: formatAccountDate(account.createdAt),
	}));

	const balancesById = Object.fromEntries(
		balances.map((entry) => [
			entry.id,
			{ balance: entry.balance, monthChange: entry.monthChange, currency: entry.currency },
		]),
	);

	// Only accounts held in the primary currency roll up into the headline — bzBudget has
	// no FX rates yet, so mixing currencies here would produce a meaningless number.
	const primaryBalances = balances.filter(
		(entry) => entry.currency.isoCode === primaryCurrency.isoCode,
	);
	const headlineTotal = primaryBalances.reduce((sum, entry) => sum + entry.balance, 0);
	const currencyCount = new Set(balances.map((entry) => entry.currency.isoCode)).size;

	return (
		<>
			<SiteHeader title="Accounts" showAddTransaction={false} />
			<div className="flex flex-col gap-4.5 px-7 py-6">
				<div>
					<Eyebrow>Accounts</Eyebrow>
					<div className="mt-1">
						<Money amount={headlineTotal} currency={primaryCurrency} className="text-[40px]" />
					</div>
					<div className="text-muted-foreground mt-1 text-[13px]">
						{accountsList.length === 0
							? "Nothing tracked yet"
							: `${accountsList.length} ${accountsList.length === 1 ? "account" : "accounts"} · ${currencyCount} ${
									currencyCount === 1 ? "currency" : "currencies"
								}`}
						{currencyCount > 1 ? ` · total shown in ${primaryCurrency.isoCode}` : ""}
					</div>
				</div>

				<AccountsList
					accounts={serializedAccounts}
					currencies={currencies}
					balances={balancesById}
				/>

				<Panel className="px-5.5 py-5">
					<h2 className="mb-1 text-sm font-semibold">Add an account manually</h2>
					<p className="text-muted-foreground mb-4 text-[12.5px]">
						Bank connections arrive later — name it, pick a currency, done.
					</p>
					<form action={createAccountAction} className="grid gap-4 sm:grid-cols-3">
						<div className="grid gap-2">
							<Label htmlFor="account-name">Account name</Label>
							<Input id="account-name" name="name" placeholder="e.g. Main checking" required />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="account-currency">Currency</Label>
							<CurrencyPicker currencies={currencies} />
						</div>
						<div className="grid gap-2">
							<Label htmlFor="account-iban">
								IBAN <span className="text-muted-foreground text-xs">(optional)</span>
							</Label>
							<Input id="account-iban" name="iban" placeholder="IBAN" autoComplete="off" />
						</div>
						<div className="sm:col-span-3">
							<Button type="submit">Save account</Button>
						</div>
					</form>
				</Panel>
			</div>
		</>
	);
}
