import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "@/db/db"

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
		async sendResetPassword(data, request) {
			console.log("Sent reset password")
		},
	},
	user: {
		additionalFields: {
			defaultCurrenciesId: {
				type: "string",
				required: true,
				input: false,
			},
		},
	},
	plugins: [nextCookies()],
})
