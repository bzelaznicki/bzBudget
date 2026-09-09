import type { ReactNode } from "react";

import { HeaderAddTransaction } from "@/components/header-add-transaction";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

/**
 * Warm Ledger top bar: title, a line of context, and the primary action on the right.
 */
export function SiteHeader({
	title,
	summary,
	actions,
	showAddTransaction = true,
}: {
	title: string;
	summary?: ReactNode;
	actions?: ReactNode;
	showAddTransaction?: boolean;
}) {
	return (
		<header className="border-border flex h-(--header-height) shrink-0 items-center border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
			<div className="flex w-full items-center gap-3 px-4 lg:px-7">
				<SidebarTrigger className="-ml-1" />
				<Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
				<h1 className="text-base font-semibold">{title}</h1>
				{summary ? (
					<span className="text-muted-foreground hidden text-[13px] md:inline">{summary}</span>
				) : null}
				<div className="ml-auto flex items-center gap-2">
					{actions}
					{showAddTransaction ? <HeaderAddTransaction /> : null}
				</div>
			</div>
		</header>
	);
}
