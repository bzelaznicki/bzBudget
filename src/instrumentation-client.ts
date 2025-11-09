import posthog from "posthog-js";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
export const POSTHOG_ENABLED = typeof POSTHOG_KEY === "string" && POSTHOG_KEY.length > 0;

if (typeof window !== "undefined" && POSTHOG_ENABLED && POSTHOG_KEY) {
	posthog.init(POSTHOG_KEY, {
		api_host: "/ingest",
		ui_host: "https://eu.posthog.com",
		defaults: "2025-05-24",
		capture_exceptions: true, // This enables capturing exceptions using Error Tracking
		debug: process.env.NODE_ENV === "development",
	});
}

export function captureClientEvent(event: string, properties?: Record<string, unknown>) {
	if (!POSTHOG_ENABLED) return;
	posthog.capture(event, properties);
}

export { posthog };
