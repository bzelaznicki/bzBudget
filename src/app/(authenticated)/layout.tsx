import type { CSSProperties, ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TransactionEventsProvider } from "@/contexts/transaction-events-context";

const SHELL_STYLES: CSSProperties = {
	"--sidebar-width": "calc(var(--spacing) * 72)",
	"--header-height": "calc(var(--spacing) * 12)",
} as CSSProperties;

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
	return (
		<SidebarProvider style={SHELL_STYLES}>
			<TransactionEventsProvider>
				<AppSidebar variant="inset" />
				<SidebarInset>{children}</SidebarInset>
			</TransactionEventsProvider>
		</SidebarProvider>
	);
}

