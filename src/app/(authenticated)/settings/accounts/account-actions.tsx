"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArchive } from "@tabler/icons-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

async function readError(res: Response, fallback: string): Promise<string> {
	try {
		const data: unknown = await res.json();
		if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
			return data.error;
		}
	} catch {
		// Non-JSON body; fall back to the generic message.
	}
	return fallback;
}

/** Confirm step for archiving: explains what stays and what disappears before doing it. */
export function ArchiveAccountButton({
	accountId,
	accountName,
	transactionCount,
}: {
	accountId: string;
	accountName: string;
	transactionCount: number;
}) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [pending, setPending] = useState(false);

	const archive = async () => {
		setPending(true);
		try {
			const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
			if (!res.ok) {
				toast.error(await readError(res, "We couldn't archive the account."));
				return;
			}
			setOpen(false);
			toast.success(`“${accountName}” archived.`);
			router.push("/settings/accounts");
			router.refresh();
		} catch {
			toast.error("We couldn't archive the account.");
		} finally {
			setPending(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="rounded-[10px]">
					Archive
				</Button>
			</DialogTrigger>
			<DialogContent className="gap-4 rounded-2xl p-6.5 sm:max-w-[460px]">
				<span className="bg-destructive/10 text-destructive flex size-10.5 items-center justify-center rounded-[13px]">
					<IconArchive className="size-5" />
				</span>
				<DialogHeader>
					<DialogTitle className="text-[17px]">Archive “{accountName}”?</DialogTitle>
					<DialogDescription className="text-secondary-foreground text-[13px] leading-relaxed">
						{transactionCount === 0
							? "It has no transactions. "
							: `Its ${transactionCount} ${transactionCount === 1 ? "transaction stays" : "transactions stay"} in your history. `}
						The account disappears from your account list and from the pickers when you log
						something new. You can restore it any time.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2.5">
					<DialogClose asChild>
						<Button variant="outline" disabled={pending}>
							Keep it active
						</Button>
					</DialogClose>
					<Button onClick={archive} disabled={pending}>
						{pending ? "Archiving…" : "Archive account"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function RestoreAccountButton({
	accountId,
	accountName,
	variant = "ghost",
}: {
	accountId: string;
	accountName: string;
	variant?: "ghost" | "default";
}) {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	const restore = async () => {
		setPending(true);
		try {
			const res = await fetch(`/api/accounts/${accountId}/restore`, { method: "POST" });
			if (!res.ok) {
				toast.error(await readError(res, "We couldn't restore the account."));
				return;
			}
			toast.success(`“${accountName}” is active again.`);
			router.refresh();
		} catch {
			toast.error("We couldn't restore the account.");
		} finally {
			setPending(false);
		}
	};

	return (
		<Button variant={variant} size="sm" onClick={restore} disabled={pending}>
			{pending ? "Restoring…" : "Restore"}
		</Button>
	);
}
