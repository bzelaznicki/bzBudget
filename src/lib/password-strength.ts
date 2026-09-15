export type PasswordStrength = {
	/** 0 = empty, 1 = weak, 2 = fair, 3 = strong, 4 = excellent. */
	score: 0 | 1 | 2 | 3 | 4;
	label: string;
	hint: string;
};

/** Better Auth's default minimum; anything shorter is rejected server-side. */
export const MIN_PASSWORD_LENGTH = 8;

const COMMON_FRAGMENTS = ["password", "qwerty", "123456", "letmein", "welcome", "admin", "budget"];

/**
 * A deliberately small heuristic for the inline meter: length does most of the work, with
 * penalties for obvious patterns. It guides people; the server still owns the rules.
 */
export function measurePassword(password: string): PasswordStrength {
	const length = password.length;

	if (length === 0) {
		return { score: 0, label: "", hint: `At least ${MIN_PASSWORD_LENGTH} characters.` };
	}

	if (length < MIN_PASSWORD_LENGTH) {
		const missing = MIN_PASSWORD_LENGTH - length;
		return {
			score: 1,
			label: "Too short",
			hint: `${missing} more ${missing === 1 ? "character" : "characters"} to go.`,
		};
	}

	const lower = password.toLowerCase();
	const hasCommonFragment = COMMON_FRAGMENTS.some((fragment) => lower.includes(fragment));
	const isRepetitive = new Set(password).size <= Math.max(2, length / 4);
	const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;

	let points = 0;
	if (length >= 12) points += 1;
	if (length >= 16) points += 1;
	if (classes >= 3) points += 1;
	if (hasCommonFragment || isRepetitive) points -= 2;

	const summary = `${length} characters`;

	if (points <= 0) {
		return {
			score: 1,
			label: "Weak",
			hint: hasCommonFragment
				? `Weak — ${summary}, but it contains a common word.`
				: `Weak — ${summary}. A few more words would help.`,
		};
	}
	if (points === 1) {
		return {
			score: 2,
			label: "Fair",
			hint: `Fair — ${summary}. Add another word to strengthen it.`,
		};
	}
	if (points === 2) {
		return {
			score: 3,
			label: "Strong",
			hint: `Strong — ${summary}. One more word makes it excellent.`,
		};
	}
	return { score: 4, label: "Excellent", hint: `Excellent — ${summary}.` };
}
