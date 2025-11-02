import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBankAccount, getUserBankAccounts } from "@/db/queries/accounts";
import type { BankAccountResponse } from "@/db/queries/accounts";
import { listCurrencies } from "@/db/queries/currencies";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CurrencyPicker } from "./currency-picker";
import { AccountsList } from "./accounts-list";

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

	const [accounts, currencies] = await Promise.all([
		getUserBankAccounts(session.user.id, 50, 0),
		listCurrencies(),
	]);

	const accountsList: BankAccountResponse[] = accounts ?? [];
	const serializedAccounts = accountsList.map((account) => ({
		...account,
		createdAt: account.createdAt ? account.createdAt.toISOString() : null,
		updatedAt: account.updatedAt ? account.updatedAt.toISOString() : null,
		deletedAt: account.deletedAt ? account.deletedAt.toISOString() : null,
		createdAtDisplay: formatAccountDate(account.createdAt),
	}));

	return (
		<>
			<SiteHeader title="Accounts" />
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
					<div className="px-4 lg:px-6">
						<div className="flex flex-col gap-6">
							<div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
								<p className="text-sm text-gray-500">Accounts</p>
								<h1 className="text-3xl font-semibold text-gray-900">Manage financial accounts</h1>
								<p className="mt-2 max-w-xl text-sm text-gray-500">
									Add accounts manually for now. Once integrations are enabled, you&apos;ll be able to connect banks directly.
								</p>
							</div>

							<div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
								<section className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">Your accounts</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Track balances, transactions, and budgets by linking each account you manage in bzBudget.
											</CardDescription>
										</CardHeader>
										<CardContent className="grid gap-4">
											<AccountsList accounts={serializedAccounts} currencies={currencies} />
										</CardContent>
									</Card>
								</section>

								<aside className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">Add account</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Start tracking a new account by entering a name and choosing a currency. You can update details later.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<form action={createAccountAction} className="grid gap-4">
												<div className="grid gap-2">
													<Label htmlFor="account-name">Account name</Label>
													<Input id="account-name" name="name" placeholder="e.g. Checking account" required />
												</div>
												<div className="grid gap-2">
													<Label htmlFor="account-currency">Currency</Label>
													<CurrencyPicker currencies={currencies} />
												</div>
												<div className="grid gap-2">
													<Label htmlFor="account-iban">
														IBAN <span className="text-xs text-gray-400">(optional)</span>
													</Label>
													<Input id="account-iban" name="iban" placeholder="IBAN" autoComplete="off" />
												</div>
												<Button type="submit" variant="default" className="w-full">
													Save account
												</Button>
											</form>
										</CardContent>
									</Card>
								</aside>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
