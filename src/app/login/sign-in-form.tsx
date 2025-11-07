"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

interface SignInFormProps {
	emailConfirmed?: boolean;
}

export function SignInForm({ emailConfirmed }: SignInFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [shouldShowConfirmationToast, setShouldShowConfirmationToast] = useState<boolean>(!!emailConfirmed);
	const hasShownConfirmationToast = useRef(false);
	const searchParams = useSearchParams();

	useEffect(() => {
		if (emailConfirmed) {
			setShouldShowConfirmationToast(true);
		}
	}, [emailConfirmed]);

	useEffect(() => {
		if (shouldShowConfirmationToast) return;
		if (searchParams?.get("emailConfirmed") === "1") {
			setShouldShowConfirmationToast(true);
		}
	}, [searchParams, shouldShowConfirmationToast]);

	useEffect(() => {
		if (!shouldShowConfirmationToast || hasShownConfirmationToast.current) return;
		hasShownConfirmationToast.current = true;
		toast.success("Email confirmed! You can now sign in.");

		if (typeof window !== "undefined" && searchParams?.has("emailConfirmed")) {
			const params = new URLSearchParams(window.location.search);
			params.delete("emailConfirmed");
			const queryString = params.toString();
			const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
			window.history.replaceState(null, "", `${nextUrl}${window.location.hash}`);
		}
	}, [searchParams, shouldShowConfirmationToast]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			await signIn.email(
				{
					email,
					password,
					callbackURL: "/dashboard",
					rememberMe,
				},
				{
					onRequest: () => {
						setLoading(true);
					},
					onResponse: () => {
						setLoading(false);
					},
					onError: (ctx) => {
						toast.error(ctx.error.message);
					},
				},
			);
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "Unable to sign in. Please try again.";
			toast.error(message);
			setLoading(false);
		}
	};

	return (
		<AuthScaffold
			highlight="Welcome back"
			title="Sign in to your budget hub"
			description="Stay on top of spending, savings, and financial goals with a single secure login."
			benefits={[
				{
					title: "Overview at a glance",
					description: "Review balances, budgets, and insights as soon as you log in.",
				},
				{
					title: "Realtime alerts",
					description: "Get notified about unusual activity and upcoming bills.",
				},
				{
					title: "Secure by design",
					description: "Multi-factor ready and encrypted end-to-end for peace of mind.",
				},
			]}
			footer="Need help getting into your account? Contact support at support@bzbudget.app"
		>
			<Card className="w-full border border-gray-100 shadow-xl shadow-emerald-100">
				<CardHeader>
					<CardTitle className="text-xl text-gray-900">Sign in</CardTitle>
					<CardDescription className="text-sm text-gray-500">
						Enter your credentials to access your dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form className="grid gap-4" onSubmit={handleSubmit}>
						<div className="grid gap-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
								onChange={(e) => {
									setEmail(e.target.value);
								}}
								value={email}
							/>
						</div>

						<div className="grid gap-2">
							<div className="flex items-center">
								<Label htmlFor="password">Password</Label>
								<Link
									href="/login/reset"
									className="ml-auto inline-block text-sm text-emerald-600 transition hover:text-emerald-700"
								>
									Forgot?
								</Link>
							</div>

							<Input
								id="password"
								type="password"
								placeholder="••••••••"
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
								<Checkbox
									id="remember"
									checked={rememberMe}
									onCheckedChange={(checked) => {
										setRememberMe(checked === true);
									}}
								/>
								Remember me
							</label>
							<span className="text-xs text-gray-400">Trusted device recommended</span>
						</div>

						<Button type="submit" variant="default" className="w-full" disabled={loading}>
							{loading ? <Loader2 size={16} className="animate-spin" /> : <span>Sign in</span>}
						</Button>
					</form>
				</CardContent>
				<CardFooter className="border-t border-gray-100 bg-gray-50/60 py-4">
					<p className="text-sm text-gray-600">
						New to bzBudget?{" "}
						<Link
							href="/register"
							className="font-medium text-emerald-600 transition hover:text-emerald-700"
						>
							Create an account
						</Link>
					</p>
				</CardFooter>
			</Card>
		</AuthScaffold>
	);
}
