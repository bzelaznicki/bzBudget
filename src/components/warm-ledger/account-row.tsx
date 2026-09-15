import type { ReactNode } from "react";
import Link from "next/link";
import { IconArchive, IconBuildingBank, IconChevronRight } from "@tabler/icons-react";

import { Monogram } from "@/components/warm-ledger/primitives";
import { type CurrencyFormat, formatMoney, monogram } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Last four characters of an IBAN, grouped the way the design shows it: "···· 4021". */
export function maskIban(iban: string | null): string | null {
	if (!iban) return null;
	const compact = iban.replace(/\s+/g, "");
	return compact.length <= 4 ? compact : `···· ${compact.slice(-4)}`;
}

type BadgeTone = "income" | "neutral" | "warning" | "destructive" | "outline" | "solid";

const BADGE_TONES: Record<BadgeTone, string> = {
	income: "bg-income/12 text-income-foreground font-medium",
	neutral: "bg-sunk text-secondary-foreground",
	warning: "bg-warning/15 text-warning-foreground font-medium",
	destructive: "bg-destructive/10 text-destructive font-medium",
	outline: "border-border text-muted-foreground border border-dashed",
	solid: "bg-foreground text-background font-medium",
};

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
	return (
		<span
			className={cn(
				"inline-flex h-5.5 items-center gap-1 rounded-full px-2.5 text-[11.5px] whitespace-nowrap",
				BADGE_TONES[tone],
			)}
		>
			{children}
		</span>
	);
}

const ROW_BASE = "flex items-center gap-3.5 rounded-[14px] border px-4.5 py-3.5";

/** An active account in the list; the whole row opens its detail page. */
export function AccountRow({
	href,
	name,
	iban,
	balance,
	monthChange,
	currency,
	isPrimaryCurrency,
}: {
	href: string;
	name: string;
	iban: string | null;
	balance: number;
	monthChange: number;
	currency: CurrencyFormat;
	isPrimaryCurrency: boolean;
}) {
	const masked = maskIban(iban);

	return (
		<Link
			href={href}
			className={cn(
				ROW_BASE,
				"bg-card border-border hover:border-foreground/15 group transition-colors",
			)}
		>
			<Monogram label={monogram(name)} className="size-10 rounded-[13px] text-[12.5px]" />
			<div className="min-w-0 flex-1 leading-snug">
				<div className="flex items-center gap-2">
					<span className="truncate text-sm font-medium">{name}</span>
					{isPrimaryCurrency ? null : <StatusBadge tone="neutral">{currency.isoCode}</StatusBadge>}
				</div>
				<div className="text-muted-foreground truncate text-xs">
					{[currency.isoCode, masked].filter(Boolean).join(" · ")}
				</div>
			</div>
			<div className="flex-none text-right leading-tight">
				<div className="text-numeric text-[15px]">{formatMoney(balance, currency)}</div>
				<div
					className={cn(
						"text-[11.5px]",
						monthChange > 0 ? "text-income-foreground" : "text-muted-foreground",
					)}
				>
					{monthChange === 0
						? "No movement this month"
						: `${formatMoney(monthChange, currency, { signed: true, decimals: false })} this month`}
				</div>
			</div>
			<IconChevronRight className="text-muted-foreground group-hover:text-foreground size-4 flex-none" />
		</Link>
	);
}

/** Archived account: dashed, faded, and offering the way back. */
export function ArchivedAccountRow({
	href,
	name,
	archivedOn,
	action,
}: {
	href: string;
	name: string;
	archivedOn: string;
	action: ReactNode;
}) {
	return (
		<div className={cn(ROW_BASE, "bg-card/60 border-border border-dashed")}>
			<span className="bg-sunk text-muted-foreground flex size-10 flex-none items-center justify-center rounded-[13px] opacity-75">
				<IconArchive className="size-4.5" />
			</span>
			<Link href={href} className="min-w-0 flex-1 leading-snug opacity-75 hover:opacity-100">
				<div className="truncate text-sm font-medium">{name}</div>
				<div className="text-muted-foreground truncate text-xs">
					Archived {archivedOn} · history kept
				</div>
			</Link>
			<div className="flex-none">{action}</div>
		</div>
	);
}

/** Dashed call-to-action closing the account list. */
export function AddAccountRow({ children, ...props }: React.ComponentProps<"button">) {
	return (
		<button
			type="button"
			className="border-border text-secondary-foreground hover:border-foreground/25 hover:text-foreground flex w-full items-center justify-center gap-2 rounded-[14px] border border-dashed p-4.5 text-[13.5px] font-medium transition-colors"
			{...props}
		>
			{children}
		</button>
	);
}

export function AccountsEmptyState({ action }: { action: ReactNode }) {
	return (
		<div className="bg-sunk flex flex-col items-center gap-3 rounded-xl px-6 py-10 text-center">
			<span className="bg-card text-secondary-foreground flex size-12 items-center justify-center rounded-[15px] shadow-[0_1px_2px_rgba(0,0,0,.06)]">
				<IconBuildingBank className="size-5.5" />
			</span>
			<div>
				<div className="text-[17px] font-semibold">No accounts yet</div>
				<p className="text-secondary-foreground mx-auto mt-1 max-w-[42ch] text-[13px] leading-relaxed">
					Add one in about twenty seconds — give it a name and a currency, and every transaction you
					log against it keeps the balance current.
				</p>
			</div>
			<div className="mt-0.5">{action}</div>
		</div>
	);
}
