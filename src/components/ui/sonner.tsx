"use client";

import * as React from "react";
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const prefersDarkQuery = "(prefers-color-scheme: dark)";

const Toaster = ({ ...props }: ToasterProps) => {
	const [theme, setTheme] = React.useState<ToasterProps["theme"]>("light");

	React.useEffect(() => {
		const media = window.matchMedia(prefersDarkQuery);
		const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
			setTheme(event.matches ? "dark" : "light");
		};
		handleChange(media);
		if (typeof media.addEventListener === "function") {
			media.addEventListener("change", handleChange);
		} else {
			media.addListener(handleChange);
		}
		return () => {
			if (typeof media.removeEventListener === "function") {
				media.removeEventListener("change", handleChange);
			} else {
				media.removeListener(handleChange);
			}
		};
	}, []);

	return (
		<Sonner
			theme={theme}
			className="toaster group"
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
