"use client";

import {
	IconCreditCard,
	IconDotsVertical,
	IconLogout,
	IconNotification,
	IconUserCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";

import { POSTHOG_ENABLED, captureClientEvent, posthog } from "@/instrumentation-client";
import { authClient } from "@/lib/auth-client";
import { redirect } from "next/navigation";

function getInitials(name: string) {
	const matches = name.matchAll(/(?:^|[^\p{L}\p{N}])(\p{L})/gu);
	const letters = Array.from(matches, (m) => m[1]);
	return (letters.length ? letters.join("") : "U").toUpperCase();
}
export function NavUser({
	user,
}: {
	user: {
		name: string;
		email: string;
		image: string | null | undefined;
	};
}) {
	const { isMobile } = useSidebar();

	const initials = getInitials(user.name);
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg grayscale">
								{user.image ? (
									<AvatarImage src={user.image} alt={user.name} />
								) : (
									<AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
								)}
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="text-muted-foreground truncate text-xs">{user.email}</span>
							</div>
							<IconDotsVertical className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									{user.image ? (
										<AvatarImage src={user.image} alt={user.name} />
									) : (
										<AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
									)}
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">{user.name}</span>
									<span className="text-muted-foreground truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem asChild>
								<Link href="/settings/profile">
									<IconUserCircle />
									Account
								</Link>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<IconCreditCard />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem>
								<IconNotification />
								Notifications
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => {
								captureClientEvent("sign_out_requested");
								void authClient.signOut({
									fetchOptions: {
										onSuccess: () => {
											captureClientEvent("sign_out_succeeded");
											if (POSTHOG_ENABLED) {
												posthog.reset();
											}
											redirect("/login");
										},
										onError: (ctx) => {
											captureClientEvent("sign_out_failed", {
												error: ctx.error.message,
											});
										},
									},
								});
							}}
						>
							<IconLogout />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
