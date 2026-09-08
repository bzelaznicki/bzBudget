"use client";

import { Button } from "@/components/ui/button";

export default function GoalsError({ reset }: { reset: () => void }) {
	return (
		<div className="space-y-4 p-6">
			<p role="alert">Unable to load your goals. Please try again.</p>
			<Button onClick={reset}>Try again</Button>
		</div>
	);
}
