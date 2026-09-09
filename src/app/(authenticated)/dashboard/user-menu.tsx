"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, UserRound } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

type UserMenuProps = {
	name: string;
	email?: string | null;
	image?: string | null;
};

function initialsFromName(name: string) {
	const trimmed = name?.trim() ?? "";
	if (!trimmed) return "B";

	const parts = trimmed
		.split(" ")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);

	if (parts.length === 0) return "B";
	if (parts.length === 1) return parts[0]!.charAt(0)?.toUpperCase() || "B";

	const first = parts[0]?.charAt(0)?.toUpperCase() ?? "";
	const last = parts[parts.length - 1]?.charAt(0)?.toUpperCase() ?? "";
	return first + last || "B";
}

function UserAvatar({ name, image }: { name: string; image?: string | null }) {
	const initials = initialsFromName(name);

	if (image) {
		return (
			<div className="relative h-12 w-12 overflow-hidden rounded-full border border-border">
				<Image src={image} alt={`${name}'s avatar`} fill sizes="48px" className="object-cover" />
			</div>
		);
	}

	return (
		<div className="flex h-12 w-12 items-center justify-center rounded-full bg-income text-base font-semibold text-white">
			{initials || <UserRound className="h-5 w-5" />}
		</div>
	);
}

export function UserMenu({ name, email, image }: UserMenuProps) {
	const [open, setOpen] = useState(false);

	return (
		<div
			className="group relative"
			onMouseEnter={() => setOpen(true)}
			onMouseLeave={() => setOpen(false)}
			onFocus={() => setOpen(true)}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget)) {
					setOpen(false);
				}
			}}
		>
			<button
				type="button"
				className="flex w-full items-center gap-3 rounded-full border border-border bg-card px-3 py-2 text-left shadow-sm backdrop-blur transition hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				aria-haspopup="true"
				aria-expanded={open}
				tabIndex={0}
				onClick={() => setOpen((prev) => !prev)}
			>
				<UserAvatar name={name} image={image} />
				<div className="hidden text-left text-sm leading-tight text-secondary-foreground sm:block">
					<p className="font-medium text-foreground">{name}</p>
					{email ? <p className="text-xs text-muted-foreground">{email}</p> : null}
				</div>
				<ChevronDown
					className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180 text-muted-foreground" : "group-hover:text-muted-foreground"}`}
				/>
			</button>
			<div
				className={`absolute right-0 top-full z-20 mt-3 w-72 rounded-2xl border border-border bg-popover p-4 shadow-2xl shadow-black/5 backdrop-blur transition duration-200 ${
					open
						? "pointer-events-auto translate-y-0 opacity-100"
						: "pointer-events-none -translate-y-1 opacity-0"
				}`}
			>
				<div className="space-y-3 text-sm text-muted-foreground">
					<div className="space-y-1">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							Account
						</p>
						<p className="font-medium text-foreground">{name}</p>
						{email ? <p className="text-xs text-muted-foreground">{email}</p> : null}
					</div>
					<div className="grid gap-2">
						<Link
							href="/settings/profile"
							className="rounded-xl border border-transparent px-3 py-2 text-left text-sm text-secondary-foreground transition hover:border-border hover:bg-income/10 hover:text-income-foreground"
						>
							Manage profile
						</Link>
						<Link
							href="/settings/accounts"
							className="rounded-xl border border-transparent px-3 py-2 text-left text-sm text-secondary-foreground transition hover:border-border hover:bg-income/10 hover:text-income-foreground"
						>
							Manage accounts
						</Link>
						<Link
							href="/settings/billing"
							className="rounded-xl border border-transparent px-3 py-2 text-left text-sm text-secondary-foreground transition hover:border-border hover:bg-income/10 hover:text-income-foreground"
						>
							Billing & plan
						</Link>
					</div>
					<div className="rounded-xl border border-border bg-income/10 p-3 text-xs text-income-foreground">
						All activity is synced across your devices. Manage secure sessions and sign-ins from the
						profile area.
					</div>
					<div className="flex justify-end">
						<SignOutButton />
					</div>
				</div>
			</div>
		</div>
	);
}
