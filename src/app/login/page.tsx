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
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { AuthScaffold } from "@/components/auth/auth-scaffold";

export default function SignIn() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);

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
					<div className="grid gap-4">
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
									href="#"
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
									onChange={(event) => {
										setRememberMe(event.target.checked);
									}}
								/>
								Remember me
							</label>
							<span className="text-xs text-gray-400">Trusted device recommended</span>
						</div>

						<Button
							type="button"
							className="w-full bg-emerald-600 hover:bg-emerald-500"
							disabled={loading}
							onClick={async () => {
								await signIn.email(
									{
										email,
										password,
										callbackURL: "/dashboard",
									},
									{
										onRequest: () => {
											setLoading(true);
										},
										onResponse: () => {
											setLoading(false);
										},
									},
								);
							}}
						>
							{loading ? (
								<Loader2 size={16} className="animate-spin" />
							) : (
								<span>Sign in</span>
							)}
						</Button>
					</div>
				</CardContent>
				<CardFooter className="border-t border-gray-100 bg-gray-50/60 py-4">
					<p className="text-sm text-gray-600">
						New to BZBudget?{" "}
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
