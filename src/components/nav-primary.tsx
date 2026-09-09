"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { captureClientEvent } from "@/instrumentation-client";

export type NavItem = {
	title: string;
	url: string;
	/** Tabler icon name rendered by the caller — passed through as a node. */
	icon: React.ReactNode;
};

/**
 * Primary navigation. The active route gets the white "raised" treatment the design
 * uses to lift the current section off the sunk sidebar.
 */
export function NavPrimary({ items }: { items: NavItem[] }) {
	const pathname = usePathname();

	return (
		<SidebarGroup>
			<SidebarGroupContent>
				<SidebarMenu className="gap-0.5">
					{items.map((item) => {
						const isActive = pathname === item.url || pathname.startsWith(`${item.url}/`);

						return (
							<SidebarMenuItem key={item.title}>
								<SidebarMenuButton
									asChild
									tooltip={item.title}
									isActive={isActive}
									className="h-[34px] rounded-[9px] text-[13.5px] data-[active=true]:font-medium data-[active=true]:shadow-[0_1px_2px_rgba(28,25,23,0.06)]"
								>
									<Link
										href={item.url}
										onClick={() =>
											captureClientEvent("nav_clicked", {
												section: "main",
												destination: item.url,
											})
										}
									>
										{item.icon}
										<span>{item.title}</span>
									</Link>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
