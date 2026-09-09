import { Eyebrow, Panel } from "@/components/warm-ledger/primitives";
import type { CategorySpendBreakdown } from "@/db/queries/overview";
import { formatMoney } from "@/lib/format";

const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Chart tokens, in the order the design assigns them to slices. */
const SLICE_COLORS = [
	"var(--chart-1)",
	"var(--chart-2)",
	"var(--chart-3)",
	"var(--chart-4)",
	"var(--chart-5)",
];

export function SpendBreakdownCard({ breakdown }: { breakdown: CategorySpendBreakdown }) {
	const { slices, total, currency } = breakdown;

	if (total <= 0 || slices.length === 0) {
		return (
			<Panel className="flex flex-1 flex-col justify-center px-5 py-4.5">
				<Eyebrow>Where it went</Eyebrow>
				<p className="text-muted-foreground mt-3 text-[12.5px]">
					No spending logged this month yet.
				</p>
			</Panel>
		);
	}

	// Lay the arcs end to end around the ring: each one starts where the previous ended.
	const arcs = slices.map((slice, index) => {
		const consumed = slices
			.slice(0, index)
			.reduce((sum, earlier) => sum + (earlier.amount / total) * CIRCUMFERENCE, 0);
		const length = (slice.amount / total) * CIRCUMFERENCE;

		return {
			...slice,
			color: SLICE_COLORS[index % SLICE_COLORS.length],
			dash: `${length.toFixed(1)} ${(CIRCUMFERENCE - length).toFixed(1)}`,
			offset: (-consumed).toFixed(1),
		};
	});

	return (
		<Panel className="flex flex-1 items-center gap-5 px-5 py-4.5">
			<svg
				viewBox="0 0 160 160"
				className="size-[132px] flex-none -rotate-90"
				role="img"
				aria-label="Spending by category this month"
			>
				<circle cx="80" cy="80" r={RADIUS} fill="none" stroke="var(--sunk)" strokeWidth="20" />
				{arcs.map((arc) => (
					<circle
						key={arc.name}
						cx="80"
						cy="80"
						r={RADIUS}
						fill="none"
						stroke={arc.color}
						strokeWidth="20"
						strokeDasharray={arc.dash}
						strokeDashoffset={arc.offset}
					/>
				))}
			</svg>

			<div className="min-w-0 flex-1">
				<Eyebrow className="mb-2.5">Where it went</Eyebrow>
				<ul className="flex flex-col gap-1.5">
					{arcs.map((arc) => (
						<li key={arc.name} className="flex items-center gap-2 text-[12.5px]">
							<span
								className="size-2 flex-none rounded-full"
								style={{ background: arc.color }}
								aria-hidden
							/>
							<span className="min-w-0 flex-1 truncate">{arc.name}</span>
							<span className="text-numeric text-secondary-foreground">
								{formatMoney(arc.amount, currency)}
							</span>
						</li>
					))}
				</ul>
			</div>
		</Panel>
	);
}
