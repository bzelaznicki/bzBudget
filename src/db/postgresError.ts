export const POSTGRES_UNIQUE_VIOLATION = "23505";

export const hasPostgresCode = (err: unknown, code: string): boolean => {
	if (!err || typeof err !== "object") {
		return false;
	}

	const maybeError = err as { code?: unknown; cause?: unknown };

	if (typeof maybeError.code === "string" && maybeError.code === code) {
		return true;
	}

	if (maybeError.cause && maybeError.cause !== err) {
		return hasPostgresCode(maybeError.cause, code);
	}

	return false;
};
