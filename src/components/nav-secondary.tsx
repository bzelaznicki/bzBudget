"use client";

import * as React from "react";
import { type ReactNode } from "react";

import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { captureClientEvent } from "@/instrumentation-client";

export function NavSecondary({
	items,
	...props
}: {
	items: {
		title: string;
		url: string;
		icon: ReactNode;
	}[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
	const handleClick = (destination: string) => {
		captureClientEvent("nav_clicked", { section: "secondary", destination });
	};

	return (
		<SidebarGroup {...props}>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton asChild>
								<a
									href={item.url}
									onClick={() => {
										handleClick(item.url);
									}}
								>
									{item.icon}
									<span>{item.title}</span>
								</a>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
