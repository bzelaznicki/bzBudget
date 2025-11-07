import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	year: "numeric",
	month: "short",
	day: "numeric",
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	hour12: true,
});

function toDate(value: Date | string | null | undefined) {
	if (!value) return null;
	const parsed = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}

function formatDisplayDate(value: Date | string | null | undefined) {
	const date = toDate(value);
	if (!date) return null;
	return DATE_FORMATTER.format(date);
}

function formatDateTime(value: Date | string | null | undefined) {
	const date = toDate(value);
	if (!date) return "Unknown";
	return DATE_TIME_FORMATTER.format(date);
}

function sessionDeviceName(userAgent: string | null | undefined) {
	if (!userAgent) return "Unknown device";
	const trimmed = userAgent.trim();
	if (trimmed.length === 0) return "Unknown device";
	return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

async function revokeSessionAction(formData: FormData) {
	"use server";

	const token = formData.get("token");

	if (typeof token !== "string" || token.trim().length === 0) {
		return;
	}

	try {
		await auth.api.revokeSession({
			headers: await cloneRequestHeaders(),
			body: { token },
		});
	} finally {
		revalidatePath("/settings/profile");
	}
}

async function cloneRequestHeaders() {
	return new Headers(await headers());
}

export default async function ManageAccountPage() {
	const requestHeaders = cloneRequestHeaders();
	const session = await auth.api.getSession({ headers: await requestHeaders });

	if (!session) {
		redirect("/login");
	}

	const sessionList = await auth.api.listSessions({
		headers: await requestHeaders,
	});

	const { user } = session;
	const createdAt = formatDisplayDate(user.createdAt);
	const activeSessions = Array.isArray(sessionList) ? sessionList : [];
	const currentToken = session.session.token;

	return (
		<>
			<SiteHeader title="Account settings" />
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
					<div className="px-4 lg:px-6">
						<div className="flex flex-col gap-6">
							<div className="rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
								<p className="text-sm text-gray-500">Account settings</p>
								<h1 className="text-3xl font-semibold text-gray-900">Manage your bzBudget account</h1>
								<p className="mt-2 max-w-xl text-sm text-gray-500">
									Update your profile details, review active connections, and keep your security
									preferences in sync.
								</p>
							</div>

							<div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
								<section className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">
												Profile details
											</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Share a name and contact so teammates and notifications know where to reach you.
											</CardDescription>
										</CardHeader>
										<CardContent>
											<form className="grid gap-4">
												<div className="grid gap-2">
													<Label htmlFor="profile-name">Name</Label>
													<Input
														id="profile-name"
														name="name"
														defaultValue={user.name ?? ""}
														placeholder="Your name"
														aria-label="Name"
													/>
												</div>
												<div className="grid gap-2">
													<Label htmlFor="profile-email">Email</Label>
													<Input
														id="profile-email"
														name="email"
														type="email"
														defaultValue={user.email ?? ""}
														placeholder="you@example.com"
														autoComplete="email"
														aria-label="Email"
													/>
												</div>
												<div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700 sm:flex-row sm:items-center sm:justify-between">
													<div>
														<p className="font-semibold tracking-wide text-emerald-800">Account status</p>
														<p>
															{user.emailVerified ? "Email verified" : "Email verification pending"}
															{createdAt ? ` • Joined ${createdAt}` : null}
														</p>
													</div>
													<Button type="button" variant="default" className="w-full sm:w-auto">
														Save changes
													</Button>
												</div>
											</form>
										</CardContent>
									</Card>

									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">
												Security & access
											</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Reset your password or review actively signed-in sessions.
											</CardDescription>
										</CardHeader>
										<CardContent className="grid gap-4">
											<div className="flex flex-col gap-2 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
												<div>
													<p className="text-sm font-medium text-gray-900">Password</p>
													<p className="text-xs text-gray-500">
														Use a strong password that you don’t reuse elsewhere.
													</p>
												</div>
												<Button type="button" variant="outline" className="w-full sm:w-auto" asChild>
													<Link href="/settings/profile/change-password">Change password</Link>
												</Button>
											</div>

											<div className="rounded-xl bg-gray-50 p-4">
												<p className="text-sm font-medium text-gray-900">Active sessions</p>
												<p className="mt-1 text-xs text-gray-500">
													Review active logins for your account. Revoke any sessions you do not recognise to keep things secure.
												</p>
												<div className="mt-4 grid gap-3 text-sm text-gray-600">
													{activeSessions.length === 0 ? (
														<div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
															No active sessions detected.
														</div>
													) : (
														activeSessions.map((sessionItem) => {
															const isCurrentSession = sessionItem.token === currentToken;
															return (
																<div
																	key={sessionItem.token}
																	className="rounded-lg border border-gray-200 bg-white/90 px-3 py-3 shadow-sm"
																>
																	<div className="flex items-start justify-between gap-2">
																		<div>
																			<p className="text-sm font-medium text-gray-900">
																				{sessionDeviceName(sessionItem.userAgent)}
																			</p>
																			<p className="text-xs text-gray-500">
																				IP address: {sessionItem.ipAddress ?? "Not available"}
																			</p>
																		</div>
																		{isCurrentSession ? (
																			<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
																				Current
																			</span>
																		) : null}
																	</div>
																	<div className="mt-2 space-y-1 text-xs text-gray-500">
																		<p>Signed in: {formatDateTime(sessionItem.createdAt)}</p>
																		<p>Last activity: {formatDateTime(sessionItem.updatedAt)}</p>
																		<p>Expires: {formatDateTime(sessionItem.expiresAt)}</p>
																	</div>
																	{isCurrentSession ? null : (
																		<form action={revokeSessionAction} className="mt-3 flex justify-end">
																			<input type="hidden" name="token" value={sessionItem.token} />
																			<Button type="submit" variant="destructive" className="whitespace-nowrap px-3 py-1.5 text-xs">
																				Revoke session
																			</Button>
																		</form>
																	)}
																</div>
															);
														})
													)}
												</div>
											</div>
										</CardContent>
									</Card>
								</section>

								<aside className="space-y-6">
									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">
												Connected services
											</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												BzBudget will list your bank feeds and integrations here.
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4 text-sm text-gray-600">
											<p>
												Once account linking is enabled, you’ll be able to see and disconnect services from this panel.
											</p>
											<div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400">
												No integrations connected yet.
											</div>
											<Button type="button" variant="default" className="w-full">
												Add a connection
											</Button>
										</CardContent>
									</Card>

									<Card className="border border-gray-100 shadow-sm">
										<CardHeader>
											<CardTitle className="text-lg font-semibold text-gray-900">Danger zone</CardTitle>
											<CardDescription className="text-sm text-gray-500">
												Need to deactivate your account? You&rsquo;ll be able to undo this for 30 days.
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-3">
											<p className="text-xs text-gray-500">
												Account deletion removes personal data and disconnects any linked services. You can restore your account by signing back in before the recovery period ends.
											</p>
											<Button type="button" variant="destructive" className="w-full">
												Delete account
											</Button>
										</CardContent>
									</Card>
								</aside>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
