import { Suspense } from "react";

import { ResetPasswordContent } from "./reset-content";

function ResetPasswordFallback() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-income/10 px-6 py-12">
			<div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg shadow-black/5">
				<p className="text-sm font-medium text-income-foreground">Loading secure reset tools…</p>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<ResetPasswordFallback />}>
			<ResetPasswordContent />
		</Suspense>
	);
}
