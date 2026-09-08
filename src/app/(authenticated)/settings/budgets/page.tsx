import { SiteHeader } from "@/components/site-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listUserCategories } from "@/db/queries/categories";
import { listBudgetsWithSpending } from "@/db/queries/budgets";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { BudgetsList } from "./budgets-list";
import { CreateBudgetForm } from "./create-budget-form";

export default async function BudgetsPage() {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const [budgets, categories] = await Promise.all([
		listBudgetsWithSpending(session.user.id),
		listUserCategories(session.user.id),
	]);

	return (
		<>
			<SiteHeader title="Budgets" />
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
					<div className="px-4 lg:px-6">
						<div className="flex flex-col gap-6">
							<div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
								<p className="text-sm text-gray-500">Budgets</p>
								<h1 className="text-3xl font-semibold text-gray-900">
									Manage your spending limits
								</h1>
								<p className="mt-2 max-w-xl text-sm text-gray-500">
									Set budgets for categories or overall spending. Get email alerts when you approach
									your limits.
								</p>
							</div>

							<div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
								<section className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">
												Your budgets
											</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Track spending against your budgets and monitor progress.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<BudgetsList budgets={budgets ?? []} />
										</CardContent>
									</Card>
								</section>

								<aside className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">
												Add budget
											</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Create a new spending limit for a category or overall.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<CreateBudgetForm categories={categories} />
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
