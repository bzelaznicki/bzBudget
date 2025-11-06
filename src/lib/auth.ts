import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/db";
import { sendConfirmationEmail } from "./inbound";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
	}),
	advanced: {
		database: {
			generateId: false,
		},
	},
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
		async sendResetPassword(data, request) {
			console.log("Sent reset password");
		},
	},
	user: {
		additionalFields: {
			defaultCurrenciesId: {
				type: "string",
				required: true,
				input: true,
			},
		},
	},
	emailVerification: {
		sendVerificationEmail: async ({ user, url, token }, request) => {
			await sendConfirmationEmail(user.email, user.name, url);
		}
	},
	plugins: [nextCookies()],
});

export type AppAuthOptions = (typeof auth)["options"];
