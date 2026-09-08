import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { listUserGoals } from "@/db/queries/goals";
import { listCurrencies } from "@/db/queries/currencies";
import { auth } from "@/lib/auth";
import { GoalsManager } from "./goals-manager";

export default async function GoalsPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");
	const [goals, currencies] = await Promise.all([listUserGoals(session.user.id), listCurrencies()]);
	return (
		<>
			<SiteHeader title="Goals" />
			<div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
				<div>
					<h1 className="text-3xl font-semibold">Your savings goals</h1>
					<p className="mt-2 text-muted-foreground">
						Set a target and update your saved amount as you make progress. Transactions do not
						change these amounts.
					</p>
				</div>
				<GoalsManager
					goals={goals}
					currencies={currencies}
					defaultCurrencyId={session.user.defaultCurrenciesId}
					today={new Date().toISOString().slice(0, 10)}
				/>
			</div>
		</>
	);
}
