import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import "@/instrumentation-client";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

const newsreader = Newsreader({
	variable: "--font-newsreader",
	subsets: ["latin"],
	weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
	title: "bzBudget",
	description: "Sort your budget",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} antialiased`}
			>
				<Toaster richColors closeButton position="bottom-center" />
				{children}
			</body>
		</html>
	);
}
