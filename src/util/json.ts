export function respondWithJSON(code: number, data: unknown) {
	if (typeof data !== "object" && typeof data !== "string") {
		throw new Error("Payload must be an object or a string")
	}

	const res = new Response(JSON.stringify(data), {
		status: code,
		headers: { "Content-Type": "application/json" },
	})

	return res
}

export function respondWithError(code: number, message: string, err?: unknown) {
	if (err) {
		console.log(errStringFromError(err))
	}

	return respondWithJSON(code, { error: message })
}

function errStringFromError(err: unknown): string {
	if (typeof err === "string") {
		return err
	}

	if (err instanceof Error) {
		return err.message
	}

	if (err) {
		return String(err)
	}

	return "An unknown error has occurred"
}
