"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { IconArrowLeft, IconCircleCheck, IconLinkOff, IconMail } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import {
	AuthHeading,
	AuthNote,
	AuthStatePanel,
	FormAlert,
	InlineAction,
	PasswordField,
} from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { captureClientEvent } from "@/instrumentation-client";
import { authClient } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-strength";

/**
 * Both halves of password recovery. Without a token the page asks for an email; the link
 * in that email lands back here with `?token=`, which switches to choosing a new password.
 * Better Auth sends `?error=INVALID_TOKEN` instead when the link has expired.
 */
export function ResetPasswordContent() {
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const tokenError = searchParams.get("error");

	return (
		<AuthScaffold
			highlight="Back in control"
			title="Locked out happens. Getting back in is quick."
			description="We email a one-time link. Open it on any device and choose a new password."
			benefits={[
				{ title: "Single use", description: "Each link works once and expires after 30 minutes." },
				{
					title: "Nothing changes until you save",
					description: "Your old password keeps working until then.",
				},
				{ title: "Human help", description: "Still stuck? Write to support@bzbudget.app." },
			]}
		>
			{tokenError ? (
				<ExpiredLinkState />
			) : token ? (
				<SetNewPasswordForm token={token} />
			) : (
				<RequestLinkForm />
			)}
		</AuthScaffold>
	);
}

function BackToSignIn() {
	return (
		<Link
			href="/login"
			className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-[12.5px]"
		>
			<IconArrowLeft className="size-3.5" />
			Back to sign in
		</Link>
	);
}

function RequestLinkForm() {
	const [email, setEmail] = useState("");
	const [isRequesting, setIsRequesting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);

	const requestLink = async (address: string) => {
		setIsRequesting(true);
		setError(null);
		captureClientEvent("password_reset_link_requested");

		try {
			const { error: requestError } = await authClient.requestPasswordReset({
				email: address,
				redirectTo: "/login/reset",
			});

			if (requestError !== null) {
				setError(requestError.message ?? "We couldn't send the link. Please try again.");
				captureClientEvent("password_reset_link_failed", { error: requestError.message });
				return;
			}
			captureClientEvent("password_reset_link_succeeded");
			setSentTo(address);
		} finally {
			setIsRequesting(false);
		}
	};

	if (sentTo) {
		return (
			<AuthStatePanel
				icon={<IconMail />}
				title="Check your inbox"
				footer={
					<>
						{error ? <FormAlert>{error}</FormAlert> : null}
						<AuthNote>
							Nothing yet? Check spam, or{" "}
							<InlineAction onClick={() => void requestLink(sentTo)} disabled={isRequesting}>
								send it again
							</InlineAction>
							.
						</AuthNote>
						<p className="text-muted-foreground text-[12.5px]">
							Wrong address? <InlineAction onClick={() => setSentTo(null)}>Change it</InlineAction>
						</p>
					</>
				}
			>
				If <span className="text-foreground font-medium">{sentTo}</span> has an account, a reset
				link is on its way. It expires in 30 minutes.
			</AuthStatePanel>
		);
	}

	return (
		<form
			className="flex flex-col gap-4"
			onSubmit={(event: FormEvent<HTMLFormElement>) => {
				event.preventDefault();
				void requestLink(email);
			}}
		>
			<AuthHeading
				title="Reset your password"
				description="We'll email a link that works for 30 minutes."
			/>
			{error ? <FormAlert>{error}</FormAlert> : null}
			<div className="grid gap-1.5">
				<Label
					htmlFor="reset-email"
					className="text-secondary-foreground text-[12.5px] font-normal"
				>
					Email
				</Label>
				<Input
					id="reset-email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
					autoComplete="email"
					className="h-11"
				/>
			</div>
			<Button type="submit" className="h-11 w-full rounded-xl" disabled={isRequesting}>
				{isRequesting ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
			</Button>
			<BackToSignIn />
		</form>
	);
}

function SetNewPasswordForm({ token }: { token: string }) {
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isResetting, setIsResetting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);

	// Only complain about the confirmation once it's at least as long as the original,
	// so the error doesn't flash on every keystroke.
	const mismatch =
		confirmPassword.length > 0 &&
		confirmPassword.length >= newPassword.length &&
		confirmPassword !== newPassword;
	const canSubmit =
		newPassword.length >= MIN_PASSWORD_LENGTH && newPassword === confirmPassword && !isResetting;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!canSubmit) return;
		setIsResetting(true);
		setError(null);
		captureClientEvent("password_reset_submitted");

		try {
			const { error: resetError } = await authClient.resetPassword({ newPassword, token });

			if (resetError) {
				setError(resetError.message ?? "We couldn't save that password. Please try again.");
				captureClientEvent("password_reset_failed", { error: resetError.message });
				return;
			}
			captureClientEvent("password_reset_succeeded");
			setDone(true);
		} finally {
			setIsResetting(false);
		}
	};

	if (done) {
		return (
			<AuthStatePanel
				icon={<IconCircleCheck />}
				title="Password saved"
				footer={
					<Button asChild className="h-11 w-full rounded-xl">
						<Link href="/login">Sign in</Link>
					</Button>
				}
			>
				Use your new password from now on.
			</AuthStatePanel>
		);
	}

	return (
		<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
			<AuthHeading
				title="Choose a new password"
				description="Your old password stops working once you save."
			/>
			{error ? <FormAlert>{error}</FormAlert> : null}
			<PasswordField
				id="new-password"
				label="New password"
				value={newPassword}
				onChange={setNewPassword}
				autoComplete="new-password"
				showStrength
			/>
			<PasswordField
				id="confirm-password"
				label="Confirm"
				value={confirmPassword}
				onChange={setConfirmPassword}
				autoComplete="new-password"
				error={mismatch ? "These don't match yet." : null}
			/>
			<Button type="submit" className="h-11 w-full rounded-xl" disabled={!canSubmit}>
				{isResetting ? <Loader2 className="size-4 animate-spin" /> : "Save password"}
			</Button>
		</form>
	);
}

function ExpiredLinkState() {
	return (
		<AuthStatePanel
			icon={<IconLinkOff />}
			title="This link has expired"
			footer={
				<>
					<Button asChild className="h-11 w-full rounded-xl">
						<Link href="/login/reset">Send a new link</Link>
					</Button>
					<BackToSignIn />
				</>
			}
		>
			Reset links work once and only for 30 minutes. Request a fresh one — it takes a few seconds.
		</AuthStatePanel>
	);
}
