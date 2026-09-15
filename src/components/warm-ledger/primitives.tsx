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

/**
 * Derives the verdict from the flags the budget query already computed, so a card agrees
 * with the on-track counts elsewhere. Each budget carries its own `alertThreshold`, so a
 * fixed 80% cutoff here would disagree with a budget that warns at, say, 60%.
 */
export function budgetState(budget: {
	isOverBudget: boolean;
	isThresholdReached: boolean;
}): BudgetState {
	if (budget.isOverBudget) return "exceeded";
	if (budget.isThresholdReached) return "threshold";
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
	// Clamped at both ends: a refund-heavy category can go negative, which would
	// otherwise produce a negative dash length.
	const filled = (Math.min(Math.max(percentage, 0), 100) / 100) * circumference;

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

/** Pill toggle on a sunk track — "Money out / Money in" in the 4a spec. */
export function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
	disabled,
	label,
	className,
}: {
	value: T;
	options: { value: T; label: ReactNode }[];
	onChange: (value: T) => void;
	disabled?: boolean;
	label: string;
	className?: string;
}) {
	return (
		<div
			role="radiogroup"
			aria-label={label}
			className={cn("bg-sunk flex w-fit gap-1 rounded-[10px] p-[3px]", className)}
		>
			{options.map((option, index) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						role="radio"
						aria-checked={selected}
						tabIndex={selected ? 0 : -1}
						disabled={disabled}
						onClick={() => onChange(option.value)}
						onKeyDown={(event) => {
							const last = options.length - 1;
							const target =
								event.key === "ArrowRight" || event.key === "ArrowDown"
									? (index + 1) % options.length
									: event.key === "ArrowLeft" || event.key === "ArrowUp"
										? (index - 1 + options.length) % options.length
										: event.key === "Home"
											? 0
											: event.key === "End"
												? last
												: -1;
							if (target === -1) return;
							event.preventDefault();
							onChange(options[target].value);
							(
								event.currentTarget.parentElement?.children[target] as HTMLElement | undefined
							)?.focus();
						}}
						className={cn(
							"focus-visible:ring-ring/50 rounded-lg px-4.5 py-1.5 text-[13px] outline-none transition-colors focus-visible:ring-[3px] disabled:opacity-50",
							selected
								? "bg-card font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

/** Label above a field, at the size and tone the Warm Ledger forms use. */
export function FieldLabel({
	htmlFor,
	children,
	className,
}: {
	htmlFor?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<label htmlFor={htmlFor} className={cn("text-secondary-foreground text-[12.5px]", className)}>
			{children}
		</label>
	);
}

export function EmptyHint({ children }: { children: ReactNode }) {
	return <p className="text-muted-foreground py-6 text-center text-[12.5px]">{children}</p>;
}
