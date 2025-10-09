import { createUser } from "@/db/queries/users";

export interface CreateUserDetails {
	firstName: string,
	lastName: string,
	email: string,
}

export async function POST(req: Request) {
	try {
		const res: CreateUserDetails = await req.json();
		if (!res.lastName || !res.firstName || !res.email) return new Response("All fields must be present", { status: 400, headers: { "Content-Type": "application/json" } });
		const user = await createUser(res.firstName, res.lastName, res.email);

		if (!user) return new Response("Failed to create user", { status: 500 });

		return new Response(JSON.stringify(user), { status: 201, headers: { "Content-Type": "application/json" } });


	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "Fatal Error";
		return new Response(message, { status: 500 });
	}
}
