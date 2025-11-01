export function respondWithJSON(code: number, data?: unknown) {
	if (typeof data !== "object" && typeof data !== "string" && typeof data !== "undefined") {
		throw new Error("Payload must be an object, a string");
	}
	if (typeof data === undefined && code !== 204) {
		throw new Error("Empty responses can only be provided on a 204 status");
	}

	const res = new Response(JSON.stringify(data), {
		status: code,
		headers: { "Content-Type": "application/json" },
	});

	return res;
}

export function respondWithError(code: number, message: string, err?: unknown) {
	if (err) {
		console.log(errStringFromError(err));
	}

	return respondWithJSON(code, { error: message });
}

function errStringFromError(err: unknown): string {
	if (typeof err === "string") {
		return err;
	}

	if (err instanceof Error) {
		return err.message;
	}

	if (err) {
		return String(err);
	}

	return "An unknown error has occurred";
}
