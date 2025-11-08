export interface UserResponse {
	id: string;
	firstName: string | null;
	lastName: string | null;
	email: string;
	createdAt: Date;
	updatedAt: Date;
}
