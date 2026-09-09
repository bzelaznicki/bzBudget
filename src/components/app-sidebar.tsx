import { type ComponentProps } from "react";
import {
	IconArrowsExchange,
	IconBuildingBank,
	IconCoins,
	IconLayoutGrid,
	IconTarget,
	IconWallet,
} from "@tabler/icons-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LeftToSpendCard } from "@/components/left-to-spend-card";
import { NavPrimary, type NavItem } from "@/components/nav-primary";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { dashboardExpensesSummary, dashboardIncomeSummary } from "@/db/queries/dashboard";
import { getPrimaryCurrency, pickCurrencyRow } from "@/db/queries/overview";
import { auth } from "@/lib/auth";
import { daysRemainingInMonth } from "@/lib/format";

const NAV_ITEMS: NavItem[] = [
	{ title: "Overview", url: "/dashboard", icon: <IconLayoutGrid /> },
	{ title: "Transactions", url: "/transactions", icon: <IconArrowsExchange /> },
	{ title: "Budgets", url: "/settings/budgets", icon: <IconWallet /> },
	{ title: "Accounts", url: "/settings/accounts", icon: <IconBuildingBank /> },
	{ title: "Goals", url: "/goals", icon: <IconTarget /> },
];

export async function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		redirect("/login");
	}

	const user = session.user;
	const currency = await getPrimaryCurrency(user.id);
	const [income, expenses] = await Promise.all([
		dashboardIncomeSummary(user.id),
		dashboardExpensesSummary(user.id),
	]);

	const incomeTotal = pickCurrencyRow(income, currency)?.current ?? 0;
	const expensesTotal = pickCurrencyRow(expenses, currency)?.current ?? 0;

	return (
		<Sidebar collapsible="offcanvas" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
							<a href="/dashboard">
								<span className="bg-income flex size-6.5 items-center justify-center rounded-lg text-white">
									<IconCoins className="size-4" />
								</span>
								<span className="text-foreground text-[15px] font-semibold tracking-tight">
									bzBudget
								</span>
							</a>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarContent>
				<NavPrimary items={NAV_ITEMS} />
			</SidebarContent>

			<SidebarFooter className="gap-3">
				<LeftToSpendCard
					amount={incomeTotal - expensesTotal}
					income={incomeTotal}
					currency={currency}
					daysLeft={daysRemainingInMonth()}
				/>
				<NavUser
					user={{
						name: user.name,
						email: user.email,
						image: user.image ?? null,
					}}
				/>
			</SidebarFooter>
		</Sidebar>
	);
}
