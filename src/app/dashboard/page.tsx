import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ArrowDownRight,
	ArrowUpRight,
	CreditCard,
	PiggyBank,
	TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { UserMenu } from "./user-menu";

type SummaryCard = {
	title: string;
	value: string;
	change: string;
	changeVariant: "up" | "down";
	description: string;
	icon: LucideIcon;
};

type Budget = {
	name: string;
	spent: number;
	limit: number;
	status: string;
};

type Activity = {
	title: string;
	description: string;
	amount: string;
	type: "in" | "out";
	time: string;
};

const summaryCards: SummaryCard[] = [
	{
		title: "Cash on hand",
		value: "$12,480.21",
		change: "+4.1%",
		changeVariant: "up",
		description: "Across all connected accounts",
		icon: PiggyBank,
	},
	{
		title: "Monthly spending",
		value: "$3,260.90",
		change: "-2.4%",
		changeVariant: "down",
		description: "Compared to the same period last month",
		icon: CreditCard,
	},
	{
		title: "Savings rate",
		value: "18.5%",
		change: "+1.2%",
		changeVariant: "up",
		description: "Portion of income saved this month",
		icon: TrendingUp,
	},
];

const budgets: Budget[] = [
	{ name: "Household & groceries", spent: 320, limit: 500, status: "On track" },
	{ name: "Transportation", spent: 140, limit: 250, status: "Slightly under" },
	{ name: "Dining out", spent: 210, limit: 300, status: "Keep an eye on it" },
];

const activities: Activity[] = [
	{
		title: "Whole Foods Market",
		description: "Groceries · Bank of Tomorrow debit",
		amount: "-$54.32",
		type: "out",
		time: "Today at 12:24 PM",
	},
	{
		title: "Salary - TechNova",
		description: "Income · Direct deposit",
		amount: "+$4,750.00",
		type: "in",
		time: "Yesterday at 08:12 AM",
	},
	{
		title: "Netflix subscription",
		description: "Entertainment · Linked to Visa ending 9242",
		amount: "-$15.99",
		type: "out",
		time: "Dec 01 at 10:00 AM",
	},
];

const insights: string[] = [
	"You're 60% of the way toward this month's savings target.",
	"Transportation costs are 12% lower than last month.",
	"Consider moving idle cash into the high-yield account for better returns.",
];

function formatName(user: { name?: string | null; email?: string | null }) {
	if (user.name && user.name.trim().length > 0) {
		return user.name.trim();
	}
	if (user.email) {
		const [emailName] = user.email.split("@");
		return emailName;
	}
	return "there";
}

function firstNameFromFull(name: string) {
	const [first] = name.split(" ");
	return first || name;
}

function budgetFill(spent: number, limit: number) {
	if (limit <= 0) return 0;
	return Math.min(100, Math.round((spent / limit) * 100));
}

export default async function DashboardPage() {
	const session = await auth.api.getSession({
		headers: headers(),
	});

	if (!session) {
		redirect("/login");
	}

	const fullName = formatName(session.user);
	const displayName = firstNameFromFull(fullName);

	return (
		<div className="min-h-screen bg-gray-50 px-6 py-10">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
				<header className="rounded-2xl bg-white px-6 py-8 shadow-sm">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="text-sm text-gray-500">Welcome back</p>
							<h1 className="text-3xl font-semibold text-gray-900">
								Hi, {displayName}
							</h1>
							<p className="mt-2 max-w-xl text-sm text-gray-500">
								Here’s a curated snapshot of cash flow, spending trends, and live
								budget progress so you always know where your money stands.
							</p>
						</div>
						<UserMenu
							name={fullName}
							email={session.user.email}
							image={session.user.image}
						/>
					</div>
				</header>

				<main className="flex flex-col gap-8">
					<section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
						{summaryCards.map((card) => {
							const Icon = card.icon;
							return (
								<Card key={card.title} className="border border-gray-100 shadow-sm">
									<CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
										<CardTitle className="text-base font-medium text-gray-500">
											{card.title}
										</CardTitle>
										<span className="rounded-full bg-gray-100 p-2 text-gray-700">
											<Icon className="h-4 w-4" />
										</span>
									</CardHeader>
									<CardContent>
										<p className="text-3xl font-semibold text-gray-900">
											{card.value}
										</p>
										<div className="mt-3 flex items-center gap-2 text-sm">
											{card.changeVariant === "up" ? (
												<ArrowUpRight className="h-4 w-4 text-emerald-500" />
											) : (
												<ArrowDownRight className="h-4 w-4 text-red-500" />
											)}
											<span
												className={
													card.changeVariant === "up"
														? "font-medium text-emerald-600"
														: "font-medium text-red-600"
												}
											>
												{card.change}
											</span>
											<span className="text-gray-500">{card.description}</span>
										</div>
									</CardContent>
								</Card>
							);
						})}
					</section>

					<section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
						<Card className="border border-gray-100 shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-gray-900">
									Recent activity
								</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									Automatically aggregated from your connected accounts.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
								{activities.map((activity) => (
									<div
										key={`${activity.title}-${activity.time}`}
										className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
									>
										<div>
											<p className="text-sm font-medium text-gray-900">
												{activity.title}
											</p>
											<p className="text-xs text-gray-500">
												{activity.description}
											</p>
										</div>
										<div className="text-right">
											<p
												className={
													activity.type === "in"
														? "text-sm font-semibold text-emerald-600"
														: "text-sm font-semibold text-gray-900"
												}
											>
												{activity.amount}
											</p>
											<p className="text-xs text-gray-400">{activity.time}</p>
										</div>
									</div>
								))}
							</CardContent>
						</Card>
						<Card className="border border-gray-100 shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-gray-900">
									Insights
								</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									Keep your goals in focus with gentle nudges.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								{insights.map((insight) => (
									<div
										key={insight}
										className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"
									>
										{insight}
									</div>
								))}
							</CardContent>
						</Card>
					</section>

					<section>
						<Card className="border border-gray-100 shadow-sm">
							<CardHeader>
								<CardTitle className="text-lg font-semibold text-gray-900">
									Budget progress
								</CardTitle>
								<CardDescription className="text-sm text-gray-500">
									Track where your money goes and stay aligned with your plan.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-5">
								{budgets.map((budget) => (
									<div key={budget.name} className="space-y-2">
										<div className="flex items-center justify-between text-sm">
											<p className="font-medium text-gray-900">{budget.name}</p>
											<p className="text-gray-500">
												${budget.spent} / ${budget.limit}
											</p>
										</div>
										<div className="h-2 rounded-full bg-gray-100">
											<div
												className="h-2 rounded-full bg-emerald-500"
												style={{ width: `${budgetFill(budget.spent, budget.limit)}%` }}
											/>
										</div>
										<p className="text-xs text-gray-500">{budget.status}</p>
									</div>
								))}
							</CardContent>
						</Card>
					</section>
				</main>
			</div>
		</div>
	);
}
