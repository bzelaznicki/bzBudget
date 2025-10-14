import { createUser } from "@/db/queries/users";
import { hasPostgresCode, POSTGRES_UNIQUE_VIOLATION } from "@/db/postgresError";
import { respondWithJSON, respondWithError } from "@/util/json";
export interface CreateUserDetails {
  firstName: string;
  lastName: string;
  email: string;
}

export async function POST(req: Request) {
  try {
    const res: CreateUserDetails = await req.json();
    if (!res.lastName || !res.firstName || !res.email)
      return respondWithError(400, "All fields must be present");

    const user = await createUser(res.firstName, res.lastName, res.email);

    if (!user)
      return respondWithError(
        500,
        "User not created",
        `Email ${res.email}, ${res.firstName} ${res.lastName} not created`,
      );

    return respondWithJSON(201, user);
  } catch (err: unknown) {
    if (hasPostgresCode(err, POSTGRES_UNIQUE_VIOLATION)) {
      return respondWithError(409, "User with this email already exists");
    }
    return respondWithError(500, "Error creating user", err);
  }
}
