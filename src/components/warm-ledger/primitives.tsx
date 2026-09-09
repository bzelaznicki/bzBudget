import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { type CurrencyFormat, formatMoney, splitMoney } from "@/lib/format";

/**
 * Warm Ledger surface: white card on the warm canvas, 16px radius, hairline border.
 * Used everywhere the design shows a panel.
 */
export function Panel({
	className,
	children,
	...props
}: React.ComponentProps<"div"> & { children: ReactNode }) {
	return (
		<div
			className={cn(
				"bg-card border-border rounded-xl border shadow-[0_1px_2px_rgba(28,25,23,0.04)]",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

export function PanelHeader({
	title,
	aside,
	className,
}: {
	title: ReactNode;
	aside?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex items-center justify-between", className)}>
			<span className="text-sm font-semibold">{title}</span>
			{aside ? <span className="text-muted-foreground text-xs">{aside}</span> : null}
		</div>
	);
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
	return <div className={cn("text-eyebrow", className)}>{children}</div>;
}

/**
 * Money set in Newsreader. `emphasis="display"` renders the decimals smaller, which is
 * how the design treats the net-worth hero.
 */
export function Money({
	amount,
	currency,
	className,
	emphasis = "plain",
}: {
	amount: number;
	currency: CurrencyFormat;
	className?: string;
	emphasis?: "plain" | "display";
}) {
	if (emphasis === "display") {
		const { whole, fraction } = splitMoney(amount, currency);
		return (
			<span className={cn("text-money", className)}>
				{whole}
				{fraction ? <span className="text-muted-foreground text-[0.55em]">{fraction}</span> : null}
			</span>
		);
	}

	return <span className={cn("text-money", className)}>{formatMoney(amount, currency)}</span>;
}

/** Tabular amount for list and table rows, tinted emerald when money came in. */
export function Amount({
	amount,
	currency,
	className,
}: {
	amount: number;
	currency: CurrencyFormat;
	className?: string;
}) {
	return (
		<span className={cn("text-numeric text-sm", amount > 0 && "text-income-foreground", className)}>
			{formatMoney(amount, currency, { signed: true })}
		</span>
	);
}

/** Grey monogram standing in for a merchant logo. */
export function Monogram({ label, className }: { label: string; className?: string }) {
	return (
		<span
			className={cn(
				"bg-sunk text-muted-foreground flex size-9 flex-none items-center justify-center rounded-[11px] text-xs font-semibold",
				className,
			)}
			aria-hidden
		>
			{label}
		</span>
	);
}

/** Neutral category pill. */
export function CategoryChip({ children }: { children: ReactNode }) {
	return (
		<span className="bg-sunk text-secondary-foreground rounded-full px-2.5 py-0.5 text-[11.5px] whitespace-nowrap">
			{children}
		</span>
	);
}

export type BudgetState = "on-track" | "threshold" | "exceeded";

const BUDGET_STATE_STYLES: Record<BudgetState, { label: string; className: string }> = {
	"on-track": { label: "On track", className: "text-income-foreground" },
	threshold: { label: "Threshold reached", className: "text-warning-foreground" },
	exceeded: { label: "Exceeded", className: "text-destructive" },
};

export function budgetState(percentage: number): BudgetState {
	if (percentage >= 100) return "exceeded";
	if (percentage >= 80) return "threshold";
	return "on-track";
}

/** Colour a budget ring/bar takes at a given utilisation. */
export function budgetStateColor(state: BudgetState): string {
	if (state === "exceeded") return "var(--destructive)";
	if (state === "threshold") return "var(--warning)";
	return "var(--income)";
}

export function BudgetStateLabel({ state, detail }: { state: BudgetState; detail?: string }) {
	const { label, className } = BUDGET_STATE_STYLES[state];

	return (
		<span className={cn("flex items-center gap-1.5 text-[11.5px] font-medium", className)}>
			<span className="size-1.5 rounded-full bg-current" />
			{label}
			{detail ? ` · ${detail}` : null}
		</span>
	);
}

/**
 * Progress ring. `percentage` may exceed 100 — the arc caps at a full circle while the
 * colour communicates the overspend.
 */
export function ProgressRing({
	percentage,
	size = 64,
	strokeWidth = 8,
	color,
	className,
}: {
	percentage: number;
	size?: number;
	strokeWidth?: number;
	color: string;
	className?: string;
}) {
	const radius = 30;
	const circumference = 2 * Math.PI * radius;
	const filled = (Math.min(percentage, 100) / 100) * circumference;

	return (
		<svg
			viewBox="0 0 80 80"
			className={cn("-rotate-90", className)}
			style={{ width: size, height: size }}
			aria-hidden
		>
			<circle
				cx="40"
				cy="40"
				r={radius}
				fill="none"
				stroke="var(--sunk)"
				strokeWidth={strokeWidth}
			/>
			<circle
				cx="40"
				cy="40"
				r={radius}
				fill="none"
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeDasharray={`${filled.toFixed(1)} ${circumference.toFixed(1)}`}
			/>
		</svg>
	);
}

export function EmptyHint({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground py-6 text-center text-[12.5px]">{children}</p>;
}
