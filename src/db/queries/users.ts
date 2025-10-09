import { users } from '../schema';
import { db } from "../db";


export interface UserResponse {
	id: string,
	firstName: string | null,
	lastName: string | null,
	email: string,
	createdAt: Date,
	updatedAt: Date,
}

export async function createUser(firstName: string, lastName: string, email: string) {
	const user: UserResponse[] = await db.insert(users).values({
		firstName,
		lastName,
		email
	}).returning({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, createdAt: users.createdAt, updatedAt: users.updatedAt })


	return user.length > 0 ? user[0] : null;

}
