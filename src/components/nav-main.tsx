"use client";

import { type ReactNode, useState, useCallback } from "react";

import Link from "next/link";

import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react";

import { TransactionDialog } from "@/components/transaction-dialog";
import type { TransactionResponse } from "@/db/queries/transactions";
import { Button } from "@/components/ui/button";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTransactionEvents } from "@/contexts/transaction-events-context";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon?: ReactNode;
	}[];
}) {
	const [transactionOpen, setTransactionOpen] = useState(false);
	const { emitTransactionCreated } = useTransactionEvents();

	const onTransactionCreated = useCallback(
		(transaction: TransactionResponse) => {
			emitTransactionCreated(transaction);
		},
		[emitTransactionCreated],
	);

	return (
		<SidebarGroup>
			<SidebarGroupContent className="flex flex-col gap-2">
				<SidebarMenu>
					<SidebarMenuItem className="flex items-center gap-2">
						<TransactionDialog
							open={transactionOpen}
							onOpenChange={setTransactionOpen}
							onTransactionCreated={onTransactionCreated}
						/>
						<SidebarMenuButton
							onClick={() => setTransactionOpen(true)}
							tooltip="Quick Create"
							className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
						>
							<IconCirclePlusFilled />
							<span>Quick Create</span>
						</SidebarMenuButton>
						<Button
							size="icon"
							className="size-8 group-data-[collapsible=icon]:opacity-0"
							variant="outline"
						>
							<IconMail />
							<span className="sr-only">Inbox</span>
						</Button>
					</SidebarMenuItem>
				</SidebarMenu>
				<SidebarMenu>
					{items.map((item) => (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton tooltip={item.title} asChild>

								<Link href={item.url}>
									{item.icon}
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}
