"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function ChangePasswordForm() {
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [signOutOthers, setSignOutOthers] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match.");
			return;
		}

		setIsSubmitting(true);

		try {
			const { error } = await authClient.changePassword({
				newPassword,
				currentPassword,
				revokeOtherSessions: true,

			});

			if (error) {
				toast.error(error.message ?? "Could not change password");
				return;
			}
			toast.success("Password updated. You'll be signed out of other devices shortly.");
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
		} catch (error) {
			const message =
				error instanceof Error && error.message
					? error.message
					: "Unable to update password. Please try again.";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form className="space-y-5" onSubmit={handleSubmit}>
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="grid gap-2 sm:col-span-2">
					<Label htmlFor="current-password" className="text-sm font-medium text-gray-900">
						Current password
					</Label>
					<Input
						id="current-password"
						type="password"
						autoComplete="current-password"
						placeholder="••••••••"
						value={currentPassword}
						onChange={(event) => setCurrentPassword(event.target.value)}
						required
					/>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="new-password" className="text-sm font-medium text-gray-900">
						New password
					</Label>
					<Input
						id="new-password"
						type="password"
						autoComplete="new-password"
						placeholder="At least 12 characters"
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						required
					/>
				</div>

				<div className="grid gap-2">
					<Label htmlFor="confirm-password" className="text-sm font-medium text-gray-900">
						Confirm new password
					</Label>
					<Input
						id="confirm-password"
						type="password"
						autoComplete="new-password"
						placeholder="Match the new password"
						value={confirmPassword}
						onChange={(event) => setConfirmPassword(event.target.value)}
						required
					/>
				</div>
			</div>

			<div className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900">
				<p className="font-medium">Password tips</p>
				<p className="text-emerald-800">
					Use a mix of upper/lowercase letters, numbers, and symbols. Avoid reusing passwords from other
					services.
				</p>
			</div>

			<div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
				<label className="flex items-center gap-3 text-gray-700">
					<Checkbox
						id="sign-out-others"
						checked={signOutOthers}
						onCheckedChange={(checked) => setSignOutOthers(checked === true)}
					/>
					<div className="flex flex-col">
						<span className="font-medium">Sign out of other sessions</span>
						<span className="text-xs text-gray-500">
							Recommended if this password may be exposed elsewhere.
						</span>
					</div>
				</label>
				<span className="text-xs text-gray-500">
					Current device remains signed in so you can continue working.
				</span>
			</div>

			<Button type="submit" className="w-full sm:w-fit" disabled={isSubmitting}>
				{isSubmitting ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Saving
					</>
				) : (
					"Update password"
				)}
			</Button>
		</form>
	);
}
