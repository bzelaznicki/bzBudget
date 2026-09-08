import { sql } from "drizzle-orm";
import { db } from "@/db/db";

export const dynamic = "force-dynamic";

// Intentionally unauthenticated: Railway probes /api/health without a session.
// This is an exception to the normal API-route session-validation convention.
export async function GET() {
	try {
		await db.execute(sql`SELECT week_start_day FROM users LIMIT 0`);
		await db.execute(sql`SELECT id FROM budgets LIMIT 0`);
		return Response.json({ status: "ok" });
	} catch {
		return Response.json({ status: "unavailable" }, { status: 503 });
	}
}
