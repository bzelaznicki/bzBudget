
export const normalizeAmountInput = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return "";

	let normalized = trimmed.replace(/\s+/g, "");
	const hasComma = normalized.includes(",");
	const hasDot = normalized.includes(".");

	if (hasComma && hasDot) {
		if (normalized.lastIndexOf(",") > normalized.lastIndexOf(".")) {
			normalized = normalized.replace(/\./g, "").replace(/,/g, ".");
		} else {
			normalized = normalized.replace(/,/g, "");
		}
	} else if (hasComma) {
		normalized = normalized.replace(/,/g, ".");
	}

	return normalized;
};
