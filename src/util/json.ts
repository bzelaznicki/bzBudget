export async function respondWithJSON(code: number, data: unknown) {
	if (typeof data !== "object" && typeof data !== "string") {
		throw new Error("Payload must be an object or a string");
	}

	const res = new Response(JSON.stringify(data), { status: code, headers: { "Content-Type": "application/json" } });

	return res;
}

export async function respondWithError(code: number, data: unknown, err?: unknown) {
	if (err) {
		console.log(err);
	}

	return respondWithJSON(code, data);
}
