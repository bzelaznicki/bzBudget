"use client";

import { useEffect } from "react";

import { POSTHOG_ENABLED, posthog } from "@/instrumentation-client";
import { useSession } from "@/lib/auth-client";

export function PosthogIdentify() {
	const { data: session, isPending } = useSession();

	useEffect(() => {
		if (!POSTHOG_ENABLED || isPending) {
			return;
		}

		const user = session?.user;

		if (user) {
			posthog.identify(user.id ?? user.email, {
				email: user.email,
				name: user.name,
			});
		} else {
			posthog.reset();
		}
	}, [isPending, session]);

	return null;
}
