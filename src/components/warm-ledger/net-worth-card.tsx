import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Eyebrow, Money, Panel } from "@/components/warm-ledger/primitives";
import type { NetWorthSeries } from "@/db/queries/overview";
import { formatMoney, formatPercent } from "@/lib/format";

const VIEW_WIDTH = 700;
const VIEW_HEIGHT = 140;
const VERTICAL_PADDING = 8;

const MONTH_LABEL = new Intl.DateTimeFormat("en-GB", { month: "short" });

/**
 * Builds the area path. Returns null when there is nothing to plot, so the card can fall
 * back to a hint instead of drawing a misleading flat line.
 */
function buildPaths(points: number[]): { line: string; fill: string } | null {
	if (points.length < 2) return null;

	const min = Math.min(...points);
	const max = Math.max(...points);
	// A flat series would divide by zero, so give it an artificial span and let it sit mid-height.
	const flat = max === min;
	const low = flat ? min - 1 : min;
	const high = flat ? max + 1 : max;

	const plotHeight = VIEW_HEIGHT - VERTICAL_PADDING * 2;
	const x = (index: number) => (index * VIEW_WIDTH) / (points.length - 1);
	const y = (value: number) =>
		VIEW_HEIGHT - VERTICAL_PADDING - ((value - low) / (high - low)) * plotHeight;

	const line = points
		.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
		.join(" ");

	return { line, fill: `${line} L${VIEW_WIDTH},${VIEW_HEIGHT} L0,${VIEW_HEIGHT} Z` };
}

export function NetWorthCard({ series }: { series: NetWorthSeries }) {
	const paths = buildPaths(series.points.map((point) => point.balance));
	const rising = series.changeAbsolute >= 0;
	const TrendIcon = rising ? IconTrendingUp : IconTrendingDown;

	return (
		<Panel className="px-6 py-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<Eyebrow>Net worth</Eyebrow>
					<div className="mt-1.5">
						<Money
							amount={series.current}
							currency={series.currency}
							emphasis="display"
							className="text-[56px]"
						/>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
						<span
							className={
								rising
									? "text-income-foreground inline-flex items-center gap-1 font-medium"
									: "text-muted-foreground inline-flex items-center gap-1 font-medium"
							}
						>
							<TrendIcon className="size-4" />
							{formatMoney(series.changeAbsolute, series.currency, { signed: true })}
						</span>
						<span className="text-muted-foreground">
							this month
							{series.changePercent === null ? null : ` · ${formatPercent(series.changePercent)}`}
						</span>
					</div>
				</div>
			</div>

			{paths ? (
				<>
					<svg
						viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
						preserveAspectRatio="none"
						className="mt-3.5 block h-[140px] w-full"
						role="img"
						aria-label={`Net worth over the last ${series.points.length} months`}
					>
						<path d={paths.fill} fill="var(--income)" fillOpacity="0.12" />
						<path
							d={paths.line}
							fill="none"
							stroke="var(--income)"
							strokeWidth="2.5"
							strokeLinejoin="round"
						/>
					</svg>
					<div className="text-muted-foreground mt-1.5 flex justify-between text-[11px]">
						{series.points.map((point) => (
							<span key={point.month}>{MONTH_LABEL.format(new Date(point.month))}</span>
						))}
					</div>
				</>
			) : (
				<p className="text-muted-foreground mt-6 mb-2 text-[12.5px]">
					Log a few transactions and your balance over time will appear here.
				</p>
			)}
		</Panel>
	);
}
