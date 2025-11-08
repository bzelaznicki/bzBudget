import { Suspense } from "react";

import { ResetPasswordContent } from "./reset-content";

function ResetPasswordFallback() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-emerald-50/70 px-6 py-12">
			<div className="w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 text-center shadow-lg shadow-emerald-100">
				<p className="text-sm font-medium text-emerald-700">Loading secure reset tools…</p>
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
