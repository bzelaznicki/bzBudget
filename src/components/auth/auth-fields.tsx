"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { IconAlertCircle, IconAlertTriangle, IconEye, IconEyeOff } from "@tabler/icons-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { measurePassword } from "@/lib/password-strength";
import { cn } from "@/lib/utils";

/** "Sign in / Create account" segmented switch at the top of both auth forms. */
export function AuthModeSwitch({ active }: { active: "sign-in" | "register" }) {
	const items = [
		{ key: "sign-in", label: "Sign in", href: "/login" },
		{ key: "register", label: "Create account", href: "/register" },
	] as const;

	return (
		<nav aria-label="Account" className="bg-sunk flex w-fit gap-1 rounded-[10px] p-[3px]">
			{items.map((item) => (
				<Link
					key={item.key}
					href={item.href}
					aria-current={item.key === active ? "page" : undefined}
					className={cn(
						"rounded-lg px-4 py-1.5 text-[13px] transition-colors",
						item.key === active
							? "bg-card text-foreground font-medium shadow-[0_1px_2px_rgba(0,0,0,.06)]"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}

export function AuthHeading({ title, description }: { title: string; description: ReactNode }) {
	return (
		<div>
			<h2 className="text-[22px] font-semibold">{title}</h2>
			<p className="text-muted-foreground mt-0.5 text-[13.5px]">{description}</p>
		</div>
	);
}

/** Inline, persistent error — the design keeps failures on the page rather than in a toast. */
export function FormAlert({ children }: { children: ReactNode }) {
	return (
		<div
			role="alert"
			className="border-destructive/30 bg-destructive/8 text-destructive flex items-start gap-2.5 rounded-[11px] border px-3.5 py-2.5 text-[12.5px] leading-snug"
		>
			<IconAlertTriangle className="mt-px size-4 flex-none" />
			<div>{children}</div>
		</div>
	);
}

export function PasswordField({
	id,
	label,
	value,
	onChange,
	autoComplete,
	showStrength = false,
	error,
	invalid = false,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	autoComplete: "new-password" | "current-password";
	showStrength?: boolean;
	error?: string | null;
	/** Marks the field without its own message, when a form-level alert already explains why. */
	invalid?: boolean;
}) {
	const [visible, setVisible] = useState(false);
	const strength = measurePassword(value);
	const ToggleIcon = visible ? IconEyeOff : IconEye;
	const describedBy = error ? `${id}-error` : showStrength ? `${id}-strength` : undefined;
	const isInvalid = invalid || Boolean(error);

	return (
		<div className="grid gap-1.5">
			<Label htmlFor={id} className="text-secondary-foreground text-[12.5px] font-normal">
				{label}
			</Label>
			<div className="relative">
				<Input
					id={id}
					type={visible ? "text" : "password"}
					value={value}
					onChange={(event) => onChange(event.target.value)}
					autoComplete={autoComplete}
					required
					aria-invalid={isInvalid ? true : undefined}
					aria-describedby={describedBy}
					className="h-11 pr-11"
				/>
				<button
					type="button"
					onClick={() => setVisible((current) => !current)}
					aria-label={visible ? "Hide password" : "Show password"}
					className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center"
				>
					{error ? (
						<IconAlertCircle className="text-destructive size-4.5" />
					) : (
						<ToggleIcon className="size-4.5" />
					)}
				</button>
			</div>

			{error ? (
				<p id={`${id}-error`} className="text-destructive text-xs">
					{error}
				</p>
			) : null}

			{showStrength && !error ? (
				<>
					<div className="flex gap-1.5" aria-hidden>
						{[1, 2, 3, 4].map((step) => (
							<span
								key={step}
								className={cn(
									"h-1 flex-1 rounded-full transition-colors",
									step <= strength.score ? strengthColor(strength.score) : "bg-sunk",
								)}
							/>
						))}
					</div>
					<p id={`${id}-strength`} className="text-secondary-foreground text-xs" aria-live="polite">
						{strength.hint}
					</p>
				</>
			) : null}
		</div>
	);
}

function strengthColor(score: number): string {
	if (score <= 1) return "bg-destructive";
	if (score === 2) return "bg-warning";
	return "bg-income";
}

/** A full-page state (sent, expired, …) that replaces the form instead of flashing a toast. */
export function AuthStatePanel({
	icon,
	title,
	children,
	footer,
}: {
	icon: ReactNode;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-4">
			<span className="bg-sunk text-secondary-foreground flex size-10.5 items-center justify-center rounded-[13px] [&_svg]:size-5">
				{icon}
			</span>
			<div>
				<h2 className="text-[22px] font-semibold">{title}</h2>
				<div className="text-secondary-foreground mt-1 text-[13.5px] leading-relaxed">
					{children}
				</div>
			</div>
			{footer}
		</div>
	);
}

export function AuthNote({ children }: { children: ReactNode }) {
	return (
		<div className="bg-sunk/60 border-border text-secondary-foreground rounded-[11px] border px-3.5 py-3 text-[12.5px] leading-snug">
			{children}
		</div>
	);
}

/** Link-styled button in the emerald accent. */
export function InlineAction({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="text-income-foreground font-medium hover:underline disabled:text-muted-foreground disabled:no-underline"
		>
			{children}
		</button>
	);
}
