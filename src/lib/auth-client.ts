import { createAuthClient } from "better-auth/react";
import type { AppAuthOptions } from "@/lib/auth";

export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_APP_URL,
	$InferAuth: null as unknown as AppAuthOptions,
});

export const { signIn, signOut, signUp, useSession } = authClient;
