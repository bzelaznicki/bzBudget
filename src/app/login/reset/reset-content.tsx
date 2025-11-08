"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isRequesting, setIsRequesting] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [activeTab, setActiveTab] = useState<"link" | "code">("link");

	useEffect(() => {
		const tabParam = searchParams.get("tab");
		const codeParam = searchParams.get("token");

		if (tabParam === "code" || codeParam) {
			setActiveTab("code");
		}

		if (codeParam && code === "") {
			setCode(codeParam);
		}
	}, [searchParams, code]);

	const handleRequestLink = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsRequesting(true);

		try {
			const { data, error } = await authClient.requestPasswordReset({
				email,
				redirectTo: "/login/reset",
			});

			if (error !== null) {
				toast.error("Error resetting password");
				return;
			}
			toast.success(data.message);
		} finally {
			setIsRequesting(false);
		}
	};

	const handleResetPassword = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsResetting(true);

		try {
			const { error } = await authClient.resetPassword({ newPassword, token: code });

			if (error) {
				toast.error(error.message ?? "Failed to reset password");
				return;
			}
			toast.success("Password reset successfully!");
			router.push("/login");
		} finally {
			setIsResetting(false);
		}
	};

	return (
		<AuthScaffold
			highlight="Back in control"
			title="Reset your password"
			description="Request a secure link or update your password with the reset code you already have."
			benefits={[
				{
					title: "Secure-by-default",
					description: "Every reset link expires quickly and can only be used once.",
				},
				{
					title: "Flexible flows",
					description: "Use either an email link or a code from your authenticator.",
				},
				{
					title: "Guided support",
					description: "Need help? Reach out anytime at support@bzbudget.app.",
				},
			]}
			footer="Trouble regaining access? Our support team can verify your identity and restore your account."
		>
			<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "link" | "code")}>
				<Card className="w-full border border-gray-100 shadow-xl shadow-emerald-100">
					<CardHeader className="space-y-4">
						<div>
							<CardTitle className="text-xl text-gray-900">Reset your password</CardTitle>
							<CardDescription className="text-sm text-gray-500">
								Start with an email link or jump straight to entering your reset code.
							</CardDescription>
						</div>
						<TabsList>
							<TabsTrigger value="link">Send reset link</TabsTrigger>
							<TabsTrigger value="code">Enter reset code</TabsTrigger>
						</TabsList>
					</CardHeader>
					<CardContent className="space-y-6">
						<TabsContent value="link" className="space-y-4">
							<form
								className="space-y-4"
								onSubmit={(event) => {
									void handleRequestLink(event);
								}}
							>
								<div className="grid gap-2">
									<Label htmlFor="reset-email">Account email</Label>
									<Input
										id="reset-email"
										type="email"
										placeholder="you@example.com"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										required
										autoComplete="email"
									/>
								</div>
								<p className="text-sm text-gray-500">
									We send a one-time link you can use for the next 15 minutes. Make sure you have access
									to this inbox before continuing.
								</p>
								<Button type="submit" className="w-full" disabled={isRequesting}>
									{isRequesting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Sending link…
										</>
									) : (
										"Email me a reset link"
									)}
								</Button>
							</form>
						</TabsContent>

						<TabsContent value="code" className="space-y-4">
							<form
								className="space-y-4"
								onSubmit={(event) => {
									void handleResetPassword(event);
								}}
							>
								<div className="grid gap-2">
									<Label htmlFor="reset-code">Reset code</Label>
									<Input
										id="reset-code"
										placeholder="Enter the 6-digit code"
										value={code}
										onChange={(event) => setCode(event.target.value)}
										required
										autoComplete="one-time-code"
									/>
									<p className="text-xs text-gray-500">
										This code appears in the email or authenticator message we just sent you.
									</p>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="new-password">New password</Label>
									<Input
										id="new-password"
										type="password"
										placeholder="••••••••"
										value={newPassword}
										onChange={(event) => setNewPassword(event.target.value)}
										required
										autoComplete="new-password"
									/>
								</div>
								<div className="grid gap-2">
									<Label htmlFor="confirm-password">Confirm new password</Label>
									<Input
										id="confirm-password"
										type="password"
										placeholder="••••••••"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										required
										autoComplete="new-password"
									/>
								</div>
								<Button type="submit" className="w-full" disabled={isResetting}>
									{isResetting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Updating password…
										</>
									) : (
										"Update password"
									)}
								</Button>
							</form>
						</TabsContent>
					</CardContent>
					<CardFooter className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 py-4 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
						<span>Remembered your credentials?</span>
						<Link href="/login" className="font-medium text-emerald-600 transition hover:text-emerald-700">
							Return to sign in
						</Link>
					</CardFooter>
				</Card>
			</Tabs>
		</AuthScaffold>
	);
}
