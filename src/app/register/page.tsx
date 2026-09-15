"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { IconMail } from "@tabler/icons-react";

import { AuthScaffold } from "@/components/auth/auth-scaffold";
import {
	AuthHeading,
	AuthModeSwitch,
	AuthNote,
	AuthStatePanel,
	FormAlert,
	InlineAction,
	PasswordField,
} from "@/components/auth/auth-fields";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { CurrencyResponse } from "@/db/queries/currencies";
import { captureClientEvent } from "@/instrumentation-client";
import { authClient, signUp } from "@/lib/auth-client";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-strength";

type SignUpEmailPayload = Parameters<(typeof signUp)["email"]>[0];

const RESEND_COOLDOWN_SECONDS = 60;
const VERIFY_CALLBACK_URL = "/login?emailConfirmed=1";

export default function SignUp() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [defaultCurrencyId, setDefaultCurrencyId] = useState("");
	const [acceptedTerms, setAcceptedTerms] = useState(false);
	const [currencies, setCurrencies] = useState<CurrencyResponse[]>([]);
	const [currenciesLoading, setCurrenciesLoading] = useState(true);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		const loadCurrencies = async () => {
			try {
				const response = await fetch("/api/currencies");
				if (!response.ok) {
					throw new Error("Failed to fetch currencies");
				}
				const data: CurrencyResponse[] = await response.json();
				if (!isMounted) {
					return;
				}
				setCurrencies(data);
				if (data.length === 1) {
					setDefaultCurrencyId(data[0].id);
				}
			} catch {
				if (isMounted) {
					setError("Currency options didn't load. Refresh the page to try again.");
				}
			} finally {
				if (isMounted) {
					setCurrenciesLoading(false);
				}
			}
		};

		void loadCurrencies();

		return () => {
			isMounted = false;
		};
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError(null);

		if (!defaultCurrencyId) {
			setError("Pick a default currency — it's how totals are shown across bzBudget.");
			return;
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
			return;
		}
		if (!acceptedTerms) {
			setError("Tick the box to accept the terms and privacy notice.");
			return;
		}

		const payload = {
			email,
			password,
			name: name.trim(),
			defaultCurrenciesId: defaultCurrencyId,
			callbackURL: VERIFY_CALLBACK_URL,
		} as SignUpEmailPayload;

		setLoading(true);
		captureClientEvent("sign_up_submitted", { defaultCurrencyId });

		try {
			const { error: signUpError } = await signUp.email(payload);
			if (signUpError) {
				const message = signUpError.message ?? "We couldn't create your account. Please try again.";
				setError(message);
				captureClientEvent("sign_up_failed", { error: message });
				return;
			}
			captureClientEvent("sign_up_succeeded");
			setSentTo(email);
		} catch (err) {
			const message =
				err instanceof Error && err.message
					? err.message
					: "We couldn't create your account. Please try again.";
			setError(message);
			captureClientEvent("sign_up_failed", { error: message });
		} finally {
			setLoading(false);
		}
	};

	return (
		<AuthScaffold
			highlight="Create your account"
			title="Set it up once. It keeps itself current."
			description="Add your accounts, set a couple of budgets, and bzBudget does the arithmetic from then on."
			benefits={[
				{ title: "Create your account", description: "Your name, an email and a password." },
				{ title: "Add your first account", description: "Name it and pick its currency." },
				{
					title: "Set a budget",
					description: "Monthly limits with a warning before you hit them.",
				},
			]}
			footer="We never sell transaction data."
		>
			{sentTo ? (
				<VerifyEmailState email={sentTo} onChangeAddress={() => setSentTo(null)} />
			) : (
				<form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate={false}>
					<AuthModeSwitch active="register" />
					<AuthHeading title="Create your account" description="Free while it's just you." />

					{error ? <FormAlert>{error}</FormAlert> : null}

					<div className="grid gap-3.5">
						<div className="grid gap-1.5">
							<Label htmlFor="name" className="text-secondary-foreground text-[12.5px] font-normal">
								Your name
							</Label>
							<Input
								id="name"
								autoComplete="name"
								required
								value={name}
								onChange={(event) => setName(event.target.value)}
								className="h-11"
							/>
						</div>

						<div className="grid gap-1.5">
							<Label
								htmlFor="email"
								className="text-secondary-foreground text-[12.5px] font-normal"
							>
								Email
							</Label>
							<Input
								id="email"
								type="email"
								autoComplete="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className="h-11"
							/>
						</div>

						<PasswordField
							id="password"
							label="Password"
							value={password}
							onChange={setPassword}
							autoComplete="new-password"
							showStrength
						/>

						<div className="grid gap-1.5">
							<Label
								htmlFor="default-currency"
								className="text-secondary-foreground text-[12.5px] font-normal"
							>
								Default currency
							</Label>
							<Select
								value={defaultCurrencyId}
								onValueChange={setDefaultCurrencyId}
								disabled={currenciesLoading || currencies.length === 0}
							>
								<SelectTrigger id="default-currency" className="h-11! w-full justify-between">
									<SelectValue
										placeholder={currenciesLoading ? "Loading currencies…" : "Choose a currency"}
									/>
								</SelectTrigger>
								{currencies.length > 0 ? (
									<SelectContent>
										{currencies.map((currency) => (
											<SelectItem key={currency.id} value={currency.id}>
												{currency.isoCode} — {currency.name}
											</SelectItem>
										))}
									</SelectContent>
								) : null}
							</Select>
						</div>

						<label className="text-secondary-foreground flex items-start gap-2.5 text-[12.5px] leading-snug">
							<Checkbox
								checked={acceptedTerms}
								onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
								className="mt-px"
							/>
							<span>
								I agree to the terms and the privacy notice. We never sell transaction data.
							</span>
						</label>

						<Button
							type="submit"
							className="h-11.5 w-full rounded-xl"
							disabled={loading || currenciesLoading}
						>
							{loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
						</Button>
					</div>
				</form>
			)}
		</AuthScaffold>
	);
}

function VerifyEmailState({
	email,
	onChangeAddress,
}: {
	email: string;
	onChangeAddress: () => void;
}) {
	const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
	const [resending, setResending] = useState(false);
	const [resendError, setResendError] = useState<string | null>(null);

	useEffect(() => {
		if (secondsLeft <= 0) return;
		const timer = window.setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [secondsLeft]);

	const resend = async () => {
		setResending(true);
		setResendError(null);
		try {
			const { error } = await authClient.sendVerificationEmail({
				email,
				callbackURL: VERIFY_CALLBACK_URL,
			});
			if (error) {
				setResendError(error.message ?? "That didn't send. Try again in a moment.");
				return;
			}
			captureClientEvent("verification_email_resent");
			setSecondsLeft(RESEND_COOLDOWN_SECONDS);
		} finally {
			setResending(false);
		}
	};

	const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

	return (
		<AuthStatePanel
			icon={<IconMail />}
			title="Check your inbox"
			footer={
				<>
					{resendError ? <FormAlert>{resendError}</FormAlert> : null}
					<AuthNote>
						Nothing yet? Check spam, or{" "}
						<InlineAction onClick={resend} disabled={secondsLeft > 0 || resending}>
							send it again
						</InlineAction>
						{secondsLeft > 0 ? ` — available in ${countdown}.` : "."}
					</AuthNote>
					<p className="text-muted-foreground text-[12.5px]">
						Wrong address? <InlineAction onClick={onChangeAddress}>Change it</InlineAction>
						{" · "}
						<Link href="/login" className="text-income-foreground font-medium hover:underline">
							Go to sign in
						</Link>
					</p>
				</>
			}
		>
			We sent a link to <span className="text-foreground font-medium">{email}</span>. Open it to
			confirm your address, then sign in. It expires in 30 minutes.
		</AuthStatePanel>
	);
}
