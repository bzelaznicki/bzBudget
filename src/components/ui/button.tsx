import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
	primary:
		"bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:outline-emerald-200",
	secondary:
		"bg-gray-900 text-white hover:bg-gray-900/90 focus-visible:outline-gray-900",
	outline:
		"border border-gray-200 bg-white text-gray-700 hover:border-emerald-100 hover:text-emerald-700 focus-visible:outline-emerald-200",
	danger:
		"border border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 focus-visible:outline-red-200",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{ className, type = "button", variant = "secondary", ...props },
		ref,
	) => (
		<button
			ref={ref}
			type={type}
			className={cn(
				"inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
				variantClasses[variant],
				className,
			)}
			{...props}
		/>
	),
);

Button.displayName = "Button";
