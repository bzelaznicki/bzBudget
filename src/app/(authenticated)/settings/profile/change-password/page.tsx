import { Fingerprint, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordForm } from "./change-password-form";

const passwordRequirements = [
	{
		title: "Length",
		description: "12 or more characters ensures plenty of entropy.",
	},
	{
		title: "Complexity",
		description: "Mix upper & lowercase letters, numbers, and symbols.",
	},
	{
		title: "Uniqueness",
		description: "Avoid words, names, or passwords used anywhere else.",
	},
];

const securityReminders = [
	{
		icon: ShieldCheck,
		title: "Enable MFA",
		description: "Pair your new password with multi-factor auth for another layer of protection.",
	},
	{
		icon: LogOut,
		title: "Review sessions",
		description: "Remove devices you don’t recognise from the session list in profile settings.",
	},
	{
		icon: Fingerprint,
		title: "Update vaults",
		description: "Refresh entries in any password managers or shared team vaults.",
	},
];

export default function ChangePasswordPage() {
	return (
		<>
			<SiteHeader title="Account settings" />
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
					<div className="px-4 lg:px-6">
						<div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
							<div className="flex flex-wrap items-center gap-3">
								<Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
									Live account
								</Badge>
								<span className="flex items-center gap-2 text-sm text-gray-500">
									<LockKeyhole className="h-4 w-4 text-emerald-600" />
									Secure password update
								</span>
							</div>
							<h1 className="mt-4 text-3xl font-semibold text-gray-900">Change your password</h1>
							<p className="mt-2 max-w-2xl text-sm text-gray-500">
								We recommend rotating passwords every few months, especially after receiving a security
								alert or sharing a device. Follow the steps below and we&apos;ll guide you through a safe
								update.
							</p>
						</div>

						<div className="mt-6 grid gap-6 lg:grid-cols-[2fr,1fr]">
							<section className="space-y-6">
								<Card className="border border-gray-100 shadow-sm">
									<CardHeader>
										<CardTitle className="text-lg font-semibold text-gray-900">Update password</CardTitle>
										<CardDescription className="text-sm text-gray-500">
											Provide your current password and a new secure password. We&apos;ll take care of the rest.
										</CardDescription>
									</CardHeader>
									<CardContent>
										<ChangePasswordForm />
									</CardContent>
								</Card>

								<Card className="border border-gray-100 shadow-sm">
									<CardHeader>
										<CardTitle className="text-lg font-semibold text-gray-900">
											What happens next?
										</CardTitle>
										<CardDescription className="text-sm text-gray-500">
											Here&apos;s what to expect after saving your new password.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4 text-sm text-gray-600">
										<div>
											<p className="font-medium text-gray-900">Confirmation email</p>
											<p>We send a quick summary to your inbox so you have a record of the change.</p>
										</div>
										<Separator />
										<div>
											<p className="font-medium text-gray-900">Session refresh</p>
											<p>
												If you chose to sign out of other sessions, they will be revoked within a minute while
												this tab stays active.
											</p>
										</div>
										<Separator />
										<div>
											<p className="font-medium text-gray-900">Need to roll back?</p>
											<p>
												If something looks wrong, reach out to support within 15 minutes and we can help restore
												access.
											</p>
										</div>
									</CardContent>
								</Card>
							</section>

							<aside className="space-y-6">
								<Card className="border border-gray-100 shadow-sm">
									<CardHeader>
										<CardTitle className="text-base font-semibold text-gray-900">
											Strong password checklist
										</CardTitle>
									</CardHeader>
									<CardContent className="space-y-4 text-sm text-gray-600">
										{passwordRequirements.map((requirement) => (
											<div key={requirement.title} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
												<p className="font-medium text-gray-900">{requirement.title}</p>
												<p>{requirement.description}</p>
											</div>
										))}
									</CardContent>
								</Card>

								<Card className="border border-gray-100 shadow-sm">
									<CardHeader>
										<CardTitle className="text-base font-semibold text-gray-900">Stay protected</CardTitle>
										<CardDescription className="text-sm text-gray-500">
											Add these quick follow ups after your password change.
										</CardDescription>
									</CardHeader>
									<CardContent className="space-y-4">
										{securityReminders.map((reminder) => (
											<div key={reminder.title} className="flex gap-3 rounded-lg border border-gray-100 p-3">
												<div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
													<reminder.icon className="h-4 w-4" />
												</div>
												<div>
													<p className="text-sm font-medium text-gray-900">{reminder.title}</p>
													<p className="text-xs text-gray-500">{reminder.description}</p>
												</div>
											</div>
										))}
									</CardContent>
								</Card>
							</aside>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
