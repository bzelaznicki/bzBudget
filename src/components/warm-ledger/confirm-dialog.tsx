"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

/**
 * Confirm step from the 5f spec: tinted icon tile, a question as the title, what stays and
 * what goes as the description, then a quiet "keep" and a solid confirm.
 */
export function ConfirmDialog({
	open,
	onOpenChange,
	icon,
	title,
	description,
	cancelLabel = "Cancel",
	confirmLabel,
	pendingLabel,
	pending = false,
	error,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	icon: ReactNode;
	title: ReactNode;
	description: ReactNode;
	cancelLabel?: string;
	confirmLabel: string;
	pendingLabel: string;
	pending?: boolean;
	error?: string | null;
	onConfirm: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
			<DialogContent className="gap-4 rounded-2xl p-6.5 sm:max-w-[460px]">
				<span className="bg-destructive/10 text-destructive flex size-10.5 items-center justify-center rounded-[13px] [&_svg]:size-5">
					{icon}
				</span>
				<DialogHeader>
					<DialogTitle className="text-[17px]">{title}</DialogTitle>
					<DialogDescription className="text-secondary-foreground text-[13px] leading-relaxed">
						{description}
					</DialogDescription>
				</DialogHeader>
				{error ? (
					<p role="alert" className="text-destructive text-[12.5px]">
						{error}
					</p>
				) : null}
				<DialogFooter className="gap-2.5">
					<DialogClose asChild>
						<Button variant="outline" disabled={pending}>
							{cancelLabel}
						</Button>
					</DialogClose>
					<Button onClick={onConfirm} disabled={pending}>
						{pending ? pendingLabel : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
