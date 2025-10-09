import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const pg = process.env.DATABASE_URL as string;
export const db = drizzle(pg, { schema });
