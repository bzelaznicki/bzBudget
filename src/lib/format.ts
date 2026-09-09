export type CurrencyFormat = {
	isoCode: string;
	symbol: string;
	position: "before" | "after";
};

/**
 * Formats an amount using the currency's own symbol and side, rather than letting
 * `Intl` pick a locale-dependent placement — the design puts the symbol where the
 * `currencies` row says it goes.
 */
export function formatMoney(
	amount: number,
	currency: CurrencyFormat,
	options: { signed?: boolean; decimals?: boolean } = {},
): string {
	const { signed = false, decimals = true } = options;
	const digits = decimals ? 2 : 0;

	const magnitude = new Intl.NumberFormat("en-GB", {
		minimumFractionDigits: digits,
		maximumFractionDigits: digits,
	}).format(Math.abs(amount));

	const body =
		currency.position === "before"
			? `${currency.symbol}${magnitude}`
			: `${magnitude} ${currency.symbol}`;

	if (signed) {
		// U+2212 minus, not a hyphen — it aligns with digits in tabular figures.
		return amount < 0 ? `−${body}` : `+${body}`;
	}

	return amount < 0 ? `−${body}` : body;
}

/** Splits a formatted amount so the decimals can be set smaller in the serif display style. */
export function splitMoney(
	amount: number,
	currency: CurrencyFormat,
): { whole: string; fraction: string } {
	const formatted = formatMoney(amount, currency);
	const separator = formatted.lastIndexOf(".");

	if (separator === -1) {
		return { whole: formatted, fraction: "" };
	}

	return { whole: formatted.slice(0, separator), fraction: formatted.slice(separator) };
}

/** Two-letter mark standing in for a merchant logo, e.g. "Deutsche Bahn" -> "DB". */
export function monogram(name: string): string {
	const words = name
		.trim()
		.split(/[\s\-_]+/)
		.filter(Boolean);

	if (words.length === 0) return "??";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

	return (words[0][0] + words[1][0]).toUpperCase();
}

/** Days left in the current month, today included. */
export function daysRemainingInMonth(now = new Date()): number {
	const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
	return Math.max(lastDay - now.getDate() + 1, 1);
}

export function formatPercent(value: number, decimals = 1): string {
	const rounded = Math.abs(value) >= 10 ? value.toFixed(0) : value.toFixed(decimals);
	return value > 0 ? `+${rounded}%` : `${rounded}%`;
}

const DAY_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	weekday: "long",
	day: "numeric",
	month: "long",
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
});

const TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	hour: "2-digit",
	minute: "2-digit",
});

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

/** Day heading for the grouped transaction list: "Today · Tuesday 8 September". */
export function formatDayHeading(date: Date, now = new Date()): string {
	const yesterday = new Date(now);
	yesterday.setDate(now.getDate() - 1);

	if (isSameDay(date, now)) return `Today · ${DAY_FORMATTER.format(date)}`;
	if (isSameDay(date, yesterday)) return `Yesterday · ${DAY_FORMATTER.format(date)}`;

	return DAY_FORMATTER.format(date);
}

/** Row-level timestamp: "Today, 09:14" or "8 Sep, 08:02". */
export function formatRowTimestamp(date: Date, now = new Date()): string {
	const prefix = isSameDay(date, now) ? "Today" : SHORT_DATE_FORMATTER.format(date);
	return `${prefix}, ${TIME_FORMATTER.format(date)}`;
}
