"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import {
	AuthHeading,
	AuthModeSwitch,
	FormAlert,
	InlineAction,
	PasswordField,
} from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureClientEvent } from "@/instrumentation-client";
import { authClient, signIn } from "@/lib/auth-client";

interface SignInFormProps {
	emailConfirmed?: boolean;
}

type SignInError = { message: string; unverified: boolean };

export function SignInForm({ emailConfirmed }: SignInFormProps) {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	const [error, setError] = useState<SignInError | null>(null);
	const [verificationSent, setVerificationSent] = useState(false);
	const [resending, setResending] = useState(false);
	const hasShownConfirmationToast = useRef(false);
	const searchParams = useSearchParams();

	const shouldShowConfirmationToast =
		!!emailConfirmed || searchParams?.get("emailConfirmed") === "1";

	useEffect(() => {
		if (!shouldShowConfirmationToast || hasShownConfirmationToast.current) return;
		hasShownConfirmationToast.current = true;
		toast.success("Email confirmed! You can now sign in.");

		if (typeof window !== "undefined" && searchParams?.has("emailConfirmed")) {
			const params = new URLSearchParams(window.location.search);
			params.delete("emailConfirmed");
			const queryString = params.toString();
			const nextUrl = queryString
				? `${window.location.pathname}?${queryString}`
				: window.location.pathname;
			window.history.replaceState(null, "", `${nextUrl}${window.location.hash}`);
		}
	}, [searchParams, shouldShowConfirmationToast]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);
		setVerificationSent(false);
		captureClientEvent("sign_in_submitted", {
			rememberMe,
		});
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
						// Better Auth answers 403 when the address hasn't been confirmed yet.
						const unverified = ctx.error.status === 403;
						setError({
							message: unverified
								? "Confirm your email before signing in — the link is in your inbox."
								: ctx.error.status === 401
									? "That email and password don't match. Check both and try again."
									: (ctx.error.message ?? "We couldn't sign you in. Please try again."),
							unverified,
						});
						captureClientEvent("sign_in_failed", {
							error: ctx.error.message,
							code: ctx.error.status,
						});
					},
				},
			);
			captureClientEvent("sign_in_succeeded", {
				rememberMe,
			});
		} catch (err) {
			const message =
				err instanceof Error && err.message ? err.message : "Unable to sign in. Please try again.";
			setError({ message, unverified: false });
			setLoading(false);
			captureClientEvent("sign_in_failed", {
				error: message,
			});
		}
	};

	const resendVerification = async () => {
		if (resending) return;
		setResending(true);
		try {
			const { error: resendError } = await authClient.sendVerificationEmail({
				email,
				callbackURL: "/login?emailConfirmed=1",
			});
			if (resendError) {
				setError({ message: resendError.message ?? "That didn't send.", unverified: false });
				return;
			}
			setVerificationSent(true);
		} catch (err) {
			const message = err instanceof Error && err.message ? err.message : "That didn't send.";
			setError({ message, unverified: false });
		} finally {
			setResending(false);
		}
	};

	return (
		<AuthScaffold
			highlight="Welcome back"
			title="Your budget, exactly where you left it."
			description="Balances, budgets and goals pick up from your last visit."
			benefits={[
				{
					title: "Overview at a glance",
					description: "Net worth, left to spend and recent activity on one screen.",
				},
				{
					title: "Budgets that warn early",
					description: "Each budget flags its threshold before you go over.",
				},
				{
					title: "Goals you can see move",
					description: "Savings goals track progress toward a date.",
				},
			]}
			footer="Need help getting into your account? Contact support at support@bzbudget.app"
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<AuthModeSwitch active="sign-in" />
				<AuthHeading title="Welcome back" description="Sign in to pick up where you left off." />

				{error ? (
					<FormAlert>
						{error.message}
						{error.unverified ? (
							<>
								{" "}
								{verificationSent ? (
									"A fresh link is on its way."
								) : (
									<InlineAction onClick={resendVerification} disabled={resending}>
										{resending ? "Sending…" : "Send a new link"}
									</InlineAction>
								)}
							</>
						) : null}
					</FormAlert>
				) : null}

				<div className="grid gap-3.5">
					<div className="grid gap-1.5">
						<Label htmlFor="email" className="text-secondary-foreground text-[12.5px] font-normal">
							Email
						</Label>
						<Input
							id="email"
							type="email"
							autoComplete="email"
							required
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							className="h-11"
						/>
					</div>

					<PasswordField
						id="password"
						label="Password"
						value={password}
						onChange={setPassword}
						autoComplete="current-password"
						invalid={Boolean(error && !error.unverified)}
					/>

					<div className="flex items-center justify-between">
						<label className="text-secondary-foreground flex cursor-pointer items-center gap-2 text-[12.5px]">
							<Checkbox
								id="remember"
								checked={rememberMe}
								onCheckedChange={(checked) => {
									setRememberMe(checked === true);
								}}
							/>
							Keep me signed in
						</label>
						<Link
							href="/login/reset"
							className="text-income-foreground text-[12.5px] font-medium hover:underline"
						>
							Forgot password?
						</Link>
					</div>

					<Button type="submit" className="h-11.5 w-full rounded-xl" disabled={loading}>
						{loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
					</Button>
				</div>
			</form>
		</AuthScaffold>
	);
}
