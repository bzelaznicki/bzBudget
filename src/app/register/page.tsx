"use client";

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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Loader2, X } from "lucide-react";
import { signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthScaffold } from "@/components/auth/auth-scaffold";
import type { CurrencyResponse } from "@/db/queries/currencies";

export default function SignUp() {
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [passwordConfirmation, setPasswordConfirmation] = useState("");
	const [image, setImage] = useState<File | null>(null);
	const [imagePreview, setImagePreview] = useState<string | null>(null);
	const [currencies, setCurrencies] = useState<CurrencyResponse[]>([]);
	const [defaultCurrencyId, setDefaultCurrencyId] = useState("");
	const [currenciesLoading, setCurrenciesLoading] = useState(true);
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setImage(file);
			const reader = new FileReader();
			reader.onloadend = () => {
				setImagePreview(reader.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

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
					toast.error("Failed to load currency options. Please try again.");
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

	return (
		<AuthScaffold
			highlight="Create your account"
			title="Launch smarter budgeting in minutes"
			description="Connect financial accounts, set goals, and receive actionable insights tailored to your spending habits."
			benefits={[
				{
					title: "Personalized budgets",
					description: "Set flexible targets and track progress in real time.",
				},
				{
					title: "Automated insights",
					description: "See where you can save more with AI-assisted suggestions.",
				},
				{
					title: "Team ready",
					description: "Invite partners or advisors to collaborate securely.",
				},
			]}
			footer="By creating an account you agree to our Terms and Privacy Policy."
		>
			<Card className="w-full border border-gray-100 shadow-xl shadow-emerald-100">
				<CardHeader>
					<CardTitle className="text-xl text-gray-900">Create your account</CardTitle>
					<CardDescription className="text-sm text-gray-500">
						Tell us a little about yourself to personalise your dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div className="grid gap-2">
								<Label htmlFor="first-name">First name</Label>
								<Input
									id="first-name"
									placeholder="Max"
									required
									onChange={(e) => {
										setFirstName(e.target.value);
									}}
									value={firstName}
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="last-name">Last name</Label>
								<Input
									id="last-name"
									placeholder="Robinson"
									required
									onChange={(e) => {
										setLastName(e.target.value);
									}}
									value={lastName}
								/>
							</div>
						</div>
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
							<Label htmlFor="default-currency">Default currency</Label>
							<Select
								value={defaultCurrencyId}
								onValueChange={setDefaultCurrencyId}
								disabled={currenciesLoading || currencies.length === 0}
							>
								<SelectTrigger
									id="default-currency"
									className="w-full justify-between"
									aria-label="Default currency"
								>
									<SelectValue
										placeholder={
											currenciesLoading
												? "Loading currencies..."
												: "Select your default currency"
										}
									/>
								</SelectTrigger>
								{currencies.length > 0 ? (
									<SelectContent>
										{currencies.map((currency) => (
											<SelectItem key={currency.id} value={currency.id}>
												<span className="flex flex-col text-left">
													<span className="font-medium text-gray-900">
														{currency.name}
													</span>
													<span className="text-xs text-gray-500">
														{currency.symbol
															? `${currency.symbol} · ${currency.isoCode}`
															: currency.isoCode}
													</span>
												</span>
											</SelectItem>
										))}
									</SelectContent>
								) : null}
							</Select>
							<p className="text-xs text-gray-500">
								{!currenciesLoading && currencies.length === 0
									? "Currencies are unavailable right now. Please refresh the page or try again later."
									: "Used to format totals and insights across your dashboard."}
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
							<div className="grid gap-2">
								<Label htmlFor="password">Password</Label>
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete="new-password"
									placeholder="Create a strong password"
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="password_confirmation">Confirm password</Label>
								<Input
									id="password_confirmation"
									type="password"
									value={passwordConfirmation}
									onChange={(e) => setPasswordConfirmation(e.target.value)}
									autoComplete="new-password"
									placeholder="Repeat password"
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="image">Profile image (optional)</Label>
							<div className="flex items-center gap-4">
								{imagePreview && (
									<div className="relative h-16 w-16 overflow-hidden rounded-md border border-gray-200">
										<Image
											src={imagePreview}
											alt="Profile preview"
											fill
											className="object-cover"
											sizes="64px"
										/>
									</div>
								)}
								<div className="flex w-full items-center gap-2">
									<Input
										id="image"
										type="file"
										accept="image/*"
										onChange={handleImageChange}
										className="w-full"
									/>
									{imagePreview && (
										<button
											type="button"
											className="rounded-full border border-gray-200 p-2 text-gray-500 transition hover:border-gray-300 hover:text-gray-700"
											onClick={() => {
												setImage(null);
												setImagePreview(null);
											}}
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>
						</div>
						<Button
							type="button"
							variant="default"
							className="w-full"
							disabled={loading || currenciesLoading}
							onClick={async () => {
								if (!defaultCurrencyId) {
									toast.error("Select a default currency before continuing.");
									return;
								}
								type SignUpEmailPayload = Parameters<(typeof signUp)["email"]>[0];
								const encodedImage = image ? await convertImageToBase64(image) : "";
								const payload = {
									email,
									password,
									name: `${firstName} ${lastName}`,
									image: encodedImage,
									defaultCurrenciesId: defaultCurrencyId,
									callbackURL: "/dashboard",
									fetchOptions: {
										onResponse: () => {
											setLoading(false);
										},
										onRequest: () => {
											setLoading(true);
										},
										onError: ({ error }: { error: { message: string } }) => {
											toast.error(error.message);
										},
										onSuccess: async () => {
											router.push("/dashboard");
										},
									},
								} as SignUpEmailPayload;
								await signUp.email(payload);
							}}
						>
							{loading ? <Loader2 size={16} className="animate-spin" /> : "Create account"}
						</Button>
					</div>
				</CardContent>
				<CardFooter className="flex flex-col items-center gap-3 border-t border-gray-100 bg-gray-50/60 py-4">
					<p className="text-sm text-gray-600">
						Already registered?{" "}
						<Link
							href="/login"
							className="font-medium text-emerald-600 transition hover:text-emerald-700"
						>
							Sign in instead
						</Link>
					</p>
				</CardFooter>
			</Card>
		</AuthScaffold>
	);
}

async function convertImageToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
