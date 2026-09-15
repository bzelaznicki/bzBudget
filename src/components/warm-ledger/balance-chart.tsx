import type { AccountDailyBalance } from "@/db/queries/overview";

const VIEW_WIDTH = 600;
const VIEW_HEIGHT = 150;
const VERTICAL_PADDING = 10;
const LABEL_COUNT = 4;

// UTC, matching the day keys `getAccountDetailFigures` builds.
const LABEL_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
});

/** Area chart of an account's end-of-day balance. */
export function BalanceChart({ series, label }: { series: AccountDailyBalance[]; label: string }) {
	if (series.length < 2) return null;

	const values = series.map((point) => point.balance);
	const min = Math.min(...values);
	const max = Math.max(...values);
	// A flat series would divide by zero, so give it an artificial span and let it sit mid-height.
	const low = max === min ? min - 1 : min;
	const high = max === min ? max + 1 : max;

	const plotHeight = VIEW_HEIGHT - VERTICAL_PADDING * 2;
	const x = (index: number) => (index * VIEW_WIDTH) / (series.length - 1);
	const y = (value: number) =>
		VIEW_HEIGHT - VERTICAL_PADDING - ((value - low) / (high - low)) * plotHeight;

	const line = values
		.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
		.join(" ");
	const fill = `${line} L${VIEW_WIDTH},${VIEW_HEIGHT} L0,${VIEW_HEIGHT} Z`;

	const labelIndexes = Array.from({ length: LABEL_COUNT }, (_, step) =>
		Math.round((step * (series.length - 1)) / (LABEL_COUNT - 1)),
	);

	return (
		<>
			<svg
				viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
				preserveAspectRatio="none"
				className="block h-[150px] w-full"
				role="img"
				aria-label={label}
			>
				<path d={fill} fill="var(--income)" fillOpacity="0.1" />
				<path
					d={line}
					fill="none"
					stroke="var(--income)"
					strokeWidth="2.5"
					strokeLinejoin="round"
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<div className="text-numeric text-muted-foreground mt-1.5 flex justify-between text-[11px]">
				{labelIndexes.map((index) => (
					<span key={series[index].day}>{LABEL_FORMATTER.format(new Date(series[index].day))}</span>
				))}
			</div>
		</>
	);
}
