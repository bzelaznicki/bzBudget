"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";

import { FormAlert } from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CurrencyResponse } from "@/db/queries/currencies";
import { ACCOUNT_NAME_MAX_LENGTH } from "@/lib/validation/accounts";
import { createAccountAction, type CreateAccountState } from "./actions";
import { CurrencyPicker } from "./currency-picker";

const INITIAL_STATE: CreateAccountState = { status: "idle" };

/**
 * "Add an account" modal. The trigger is passed in so the same dialog opens from the page
 * header, the dashed row at the end of the list, and the empty state.
 */
export function AddAccountDialog({
	currencies,
	trigger,
}: {
	currencies: CurrencyResponse[];
	trigger: ReactNode;
}) {
	const [open, setOpen] = useState(false);
	// Remounting the form on every open resets its fields and any stale error.
	const [formKey, setFormKey] = useState(0);

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (next) setFormKey((key) => key + 1);
			}}
		>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="gap-4.5 rounded-[20px] p-7 sm:max-w-[560px]">
				<DialogHeader>
					<DialogTitle className="text-base">Add an account</DialogTitle>
					<DialogDescription className="text-[12.5px]">
						Manual account — its balance follows the transactions you log against it.
					</DialogDescription>
				</DialogHeader>
				<AddAccountForm key={formKey} currencies={currencies} onDone={() => setOpen(false)} />
			</DialogContent>
		</Dialog>
	);
}

function AddAccountForm({
	currencies,
	onDone,
}: {
	currencies: CurrencyResponse[];
	onDone: () => void;
}) {
	const [state, formAction, pending] = useActionState(createAccountAction, INITIAL_STATE);
	const [name, setName] = useState("");
	const handledSuccess = useRef(false);

	useEffect(() => {
		if (state.status === "created" && !handledSuccess.current) {
			handledSuccess.current = true;
			toast.success("Account added.");
			onDone();
		}
	}, [state, onDone]);

	return (
		<form action={formAction} className="grid gap-3.5">
			{state.status === "error" && state.message ? <FormAlert>{state.message}</FormAlert> : null}

			<div className="grid gap-1.5">
				<Label
					htmlFor="account-name"
					className="text-secondary-foreground text-[12.5px] font-normal"
				>
					Account name
				</Label>
				<div className="relative">
					<Input
						id="account-name"
						name="name"
						placeholder="e.g. Joint checking"
						required
						maxLength={ACCOUNT_NAME_MAX_LENGTH}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="h-11 pr-16"
						autoFocus
					/>
					<span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[11.5px]">
						{name.length}/{ACCOUNT_NAME_MAX_LENGTH}
					</span>
				</div>
			</div>

			<div className="grid gap-3 sm:grid-cols-[1fr_1.2fr]">
				<div className="grid content-start gap-1.5">
					<Label
						htmlFor="account-currency"
						className="text-secondary-foreground text-[12.5px] font-normal"
					>
						Currency
					</Label>
					<CurrencyPicker currencies={currencies} id="account-currency" />
				</div>
				<div className="grid content-start gap-1.5">
					<Label
						htmlFor="account-iban"
						className="text-secondary-foreground text-[12.5px] font-normal"
					>
						IBAN <span className="text-muted-foreground">· optional</span>
					</Label>
					<Input
						id="account-iban"
						name="iban"
						placeholder="Only the last four digits are shown"
						autoComplete="off"
						className="h-11"
					/>
				</div>
			</div>

			<div className="mt-1 flex gap-2.5">
				<Button type="button" variant="outline" className="h-11 rounded-xl px-4.5" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" className="h-11 flex-1 rounded-xl" disabled={pending}>
					{pending ? "Adding…" : "Add account"}
				</Button>
			</div>
		</form>
	);
}

export function AddAccountButton(props: React.ComponentProps<typeof Button>) {
	return (
		<Button size="sm" {...props}>
			<IconPlus />
			Add an account
		</Button>
	);
}
