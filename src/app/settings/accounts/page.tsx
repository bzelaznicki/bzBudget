import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getUserBankAccounts } from "@/db/queries/accounts";
import { createBankAccount } from "@/db/queries/accounts";
import { listCurrencies } from "@/db/queries/currencies";
import type { BankAccountResponse } from "@/db/queries/accounts";
import type { CurrencyResponse } from "@/db/queries/currencies";
import { CurrencyPicker } from "./currency-picker";

function formatDateTime(value: Date | string | null | undefined) {
	if (!value) return "Unknown";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "Unknown";
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
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
	const currencyLookup = new Map<string, CurrencyResponse>();
	currencies.forEach((currency) => {
		currencyLookup.set(currency.id, currency);
	});

	return (
		<div className="min-h-screen bg-gray-50 px-6 py-10">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<header className="flex flex-col gap-4 rounded-2xl bg-white px-6 py-8 shadow-sm sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-sm text-gray-500">Accounts</p>
						<h1 className="text-3xl font-semibold text-gray-900">Manage financial accounts</h1>
						<p className="mt-2 max-w-xl text-sm text-gray-500">
							Add accounts manually for now. Once integrations are enabled, you&apos;ll be able to
							connect banks directly.
						</p>
					</div>
					<Link
						href="/dashboard"
						className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
					>
						← Back to dashboard
					</Link>
				</header>

				<main className="grid gap-6 lg:grid-cols-[2fr,1fr]">
					<section className="space-y-6">
						<Card className="border border-gray-100 shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-gray-900">Your accounts</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									Track balances, transactions, and budgets by linking each account you manage in
									bzBudget.
								</CardDescription>
							</CardHeader>
							<CardContent className="grid gap-4">
								{accountsList.length === 0 ? (
									<div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-gray-500">
										No accounts yet. Use the form on the right to add your first account.
									</div>
								) : (
									accountsList.map((account) => {
										const currency = currencyLookup.get(account.currenciesId);
										return (
											<div
												key={account.id}
												className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white/90 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
											>
												<div>
													<p className="text-sm font-medium text-gray-900">{account.name}</p>
													<p className="text-xs text-gray-500">
														{currency
															? `${currency.symbol} ${currency.isoCode}`
															: "Unknown currency"}
														{account.iban ? ` • IBAN ${account.iban}` : null}
													</p>
												</div>
												<div className="text-right text-xs text-gray-400">
													<p>Created {formatDateTime(account.createdAt)}</p>
												</div>
											</div>
										);
									})
								)}
							</CardContent>
						</Card>
					</section>

					<aside className="space-y-6">
						<Card className="border border-gray-100 shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-gray-900">Add account</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									Start tracking a new account by entering a name and choosing a currency. You can
									update details later.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form action={createAccountAction} className="grid gap-4">
									<div className="grid gap-2">
										<Label htmlFor="account-name">Account name</Label>
										<Input
											id="account-name"
											name="name"
											placeholder="e.g. Checking account"
											required
										/>
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
				</main>
			</div>
		</div>
	);
}
