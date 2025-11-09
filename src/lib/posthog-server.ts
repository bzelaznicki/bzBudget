import { PostHog } from "posthog-node";

const SERVER_KEY =
	process.env.POSTHOG_SERVER_KEY ?? process.env.POSTHOG_API_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY ?? null;
const SERVER_HOST = process.env.POSTHOG_HOST ?? "https://eu.posthog.com";

export function createServerPosthog() {
	if (!SERVER_KEY) return null;

	return new PostHog(SERVER_KEY, {
		host: SERVER_HOST,
		flushAt: 1,
	});
}

export type ServerPostHogClient = ReturnType<typeof createServerPosthog>;

export async function captureServerEvent(
	client: ServerPostHogClient,
	event: string,
	distinctId: string,
	properties?: Record<string, unknown>,
) {
	if (!client) return;

	client.capture({
		distinctId,
		event,
		properties,
	});
}

export async function shutdownServerPosthog(client: ServerPostHogClient) {
	if (!client) return;

	await client.shutdown();
}
