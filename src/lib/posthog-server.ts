import { PostHog } from "posthog-node";

const SERVER_KEY =
	process.env.POSTHOG_SERVER_KEY ?? process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
const SERVER_HOST = process.env.POSTHOG_HOST ?? "https://eu.posthog.com";

function logAnalyticsWarning(message: string, error?: unknown) {
	if (process.env.NODE_ENV === "test") return;
	if (error) {
		console.warn(`[analytics] ${message}`, error);
	} else {
		console.warn(`[analytics] ${message}`);
	}
}

export function createServerPosthog() {
	if (!SERVER_KEY) return null;

	try {
		return new PostHog(SERVER_KEY, {
			host: SERVER_HOST,
			flushAt: 1,
		});
	} catch (error) {
		logAnalyticsWarning("Failed to initialize PostHog server client", error);
		return null;
	}
}

export type ServerPostHogClient = ReturnType<typeof createServerPosthog>;

export async function captureServerEvent(
	client: ServerPostHogClient,
	event: string,
	distinctId: string,
	properties?: Record<string, unknown>,
) {
	if (!client) return;

	try {
		await client.capture({
			distinctId,
			event,
			properties,
		});
	} catch (error) {
		logAnalyticsWarning(`Failed to capture server event "${event}"`, error);
	}
}

export async function shutdownServerPosthog(client: ServerPostHogClient) {
	if (!client) return;

	try {
		await client.shutdown();
	} catch (error) {
		logAnalyticsWarning("Failed to flush PostHog server client", error);
	}
}
