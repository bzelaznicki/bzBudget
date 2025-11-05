"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const description = "An interactive area chart";

type TimeRange = "7d" | "30d" | "90d";

type TransactionType = "incoming" | "outgoing";
type ChartMetric = "count" | "amount";

type TransactionStatisticsResponse = {
	date: string;
	categoryId: string | null;
	categoryName: string | null;
	count: number;
	totalAmount: number;
};

type ChartSeries = {
	key: string;
	label: string;
	color: string;
};

type ChartRow = {
	date: string;
	[key: string]: number | string;
};

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	"90d": "Last 3 months",
};

const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
	incoming: "Incoming",
	outgoing: "Outgoing",
};

const METRIC_LABELS: Record<ChartMetric, string> = {
	count: "Transaction count",
	amount: "Total amount",
};

const CATEGORY_COLORS = Array.from({ length: 18 }, (_, index) => `var(--chart-${index + 1})`);

function formatDate(date: Date) {
	const formatted = new Date(date);
	formatted.setUTCHours(0, 0, 0, 0);
	return formatted.toISOString().split("T")[0] ?? "";
}

function computeDateRange(range: TimeRange) {
	const now = new Date();
	now.setUTCHours(0, 0, 0, 0);
	const dateTo = now;
	const dateFrom = new Date(now);
	dateFrom.setDate(dateFrom.getDate() - (TIME_RANGE_DAYS[range] - 1));
	return { dateFrom, dateTo };
}

function enumerateDates(dateFrom: Date, dateTo: Date) {
	const dates: string[] = [];
	const current = new Date(dateFrom);
	while (current <= dateTo) {
		dates.push(formatDate(current));
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

function buildChartData(
	statistics: TransactionStatisticsResponse[],
	dateFrom: Date,
	dateTo: Date,
	metric: ChartMetric,
): { rows: ChartRow[]; series: ChartSeries[] } {
	const categoryMap = new Map<string, ChartSeries>();
	const totals = new Map<string, Record<string, number>>();

	for (const stat of statistics) {
		const categoryKey = `category-${stat.categoryId ?? "uncategorized"}`;
		if (!categoryMap.has(categoryKey)) {
			const colorIndex = categoryMap.size % CATEGORY_COLORS.length;
			categoryMap.set(categoryKey, {
				key: categoryKey,
				label: stat.categoryName ?? "Uncategorized",
				color: CATEGORY_COLORS[colorIndex],
			});
		}
		const value = metric === "amount" ? stat.totalAmount : stat.count;
		const dateTotals = totals.get(stat.date) ?? {};
		dateTotals[categoryKey] = (dateTotals[categoryKey] ?? 0) + value;
		totals.set(stat.date, dateTotals);
	}

	const sortedDates = enumerateDates(dateFrom, dateTo);
	const rows: ChartRow[] = sortedDates.map((date) => {
		const rowTotals = totals.get(date) ?? {};
		const row: ChartRow = { date };
		categoryMap.forEach((series) => {
			row[series.key] = rowTotals[series.key] ?? 0;
		});
		return row;
	});

	return { rows, series: Array.from(categoryMap.values()) };
}

export function ChartAreaInteractive() {
	const isMobile = useIsMobile();
	const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
	const [transactionType, setTransactionType] = React.useState<TransactionType>("outgoing");
	const [metric, setMetric] = React.useState<ChartMetric>("amount");
	const [statistics, setStatistics] = React.useState<TransactionStatisticsResponse[]>([]);
	const [rangeDates, setRangeDates] = React.useState<{ dateFrom: Date; dateTo: Date } | null>(null);
	const [isLoading, setIsLoading] = React.useState<boolean>(true);
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (isMobile) {
			setTimeRange("7d");
		}
	}, [isMobile]);

	React.useEffect(() => {
		const controller = new AbortController();
		const { dateFrom, dateTo } = computeDateRange(timeRange);
		setRangeDates({
			dateFrom: new Date(dateFrom),
			dateTo: new Date(dateTo),
		});
		const dateFromParam = formatDate(dateFrom);
		const dateToParam = formatDate(dateTo);

		async function loadStatistics() {
			setIsLoading(true);
			setError(null);

			try {
				const params = new URLSearchParams({
					dateFrom: dateFromParam,
					dateTo: dateToParam,
				});
				params.set("type", transactionType);
				const response = await fetch(`/api/transactions/statistics?${params.toString()}`, {
					signal: controller.signal,
				});
				if (!response.ok) {
					const payload = (await response.json().catch(() => null)) as { error?: string } | null;
					throw new Error(payload?.error ?? "Error fetching statistics");
				}
				const data = (await response.json()) as TransactionStatisticsResponse[];
				if (!Array.isArray(data)) {
					throw new Error("Unexpected statistics response");
				}
				const normalized = data.map((item) => ({
					...item,
					count: Number(item.count ?? 0),
					totalAmount: Number(item.totalAmount ?? 0),
				}));
				if (!controller.signal.aborted) {
					setStatistics(normalized);
				}
			} catch (err) {
				if (controller.signal.aborted) {
					return;
				}
				const message = err instanceof Error ? err.message : "Error fetching statistics";
				setStatistics([]);
				setError(message);
			} finally {
				if (!controller.signal.aborted) {
					setIsLoading(false);
				}
			}
		}

		void loadStatistics();

		return () => {
			controller.abort();
		};
	}, [timeRange, transactionType]);

	const chartComputation = React.useMemo(() => {
		if (!rangeDates) {
			return { rows: [] as ChartRow[], series: [] as ChartSeries[] };
		}
		return buildChartData(statistics, rangeDates.dateFrom, rangeDates.dateTo, metric);
	}, [statistics, rangeDates, metric]);

	const chartRows = chartComputation.rows;
	const series = chartComputation.series;

	const chartConfig = React.useMemo<ChartConfig>(() => {
		return series.reduce((acc, current) => {
			acc[current.key] = {
				label: current.label,
				color: current.color,
			};
			return acc;
		}, {} as ChartConfig);
	}, [series]);

	const timeRangeLabel = TIME_RANGE_LABELS[timeRange];
	const typeLabel = TRANSACTION_TYPE_LABELS[transactionType];
	const typeLabelLower = typeLabel.toLowerCase();
	const metricDescription = metric === "count" ? "transaction counts" : "total amounts";
	const metricShortLabel = metric === "count" ? "counts" : "amounts";

	return (
		<Card className="@container/card">
			<CardHeader>
				<CardTitle>Transactions by Category</CardTitle>
				<CardDescription>
					<span className="hidden @[540px]/card:block">
						Aggregated {typeLabelLower} {metricDescription} for {timeRangeLabel.toLowerCase()}
					</span>
					<span className="@[540px]/card:hidden">
						{typeLabel} {metricShortLabel} - {timeRangeLabel}
					</span>
				</CardDescription>
				<CardAction className="flex flex-col gap-2 @[767px]/card:flex-row @[767px]/card:flex-wrap @[767px]/card:justify-end">
					<ToggleGroup
						type="single"
						value={timeRange}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setTimeRange(value as TimeRange);
						}}
						variant="outline"
						className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
					>
						<ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
						<ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
						<ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
					</ToggleGroup>
					<Select
						value={timeRange}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setTimeRange(value as TimeRange);
						}}
					>
						<SelectTrigger
							className="flex w-full min-w-[9rem] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label="Select a time range"
						>
							<SelectValue placeholder={TIME_RANGE_LABELS["7d"]} />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="90d" className="rounded-lg">
								Last 3 months
							</SelectItem>
							<SelectItem value="30d" className="rounded-lg">
								Last 30 days
							</SelectItem>
							<SelectItem value="7d" className="rounded-lg">
								Last 7 days
							</SelectItem>
						</SelectContent>
					</Select>
					<ToggleGroup
						type="single"
						value={transactionType}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setTransactionType(value as TransactionType);
						}}
						variant="outline"
						className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
					>
						<ToggleGroupItem value="outgoing">Outgoing</ToggleGroupItem>
						<ToggleGroupItem value="incoming">Incoming</ToggleGroupItem>
					</ToggleGroup>
					<Select
						value={transactionType}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setTransactionType(value as TransactionType);
						}}
					>
						<SelectTrigger
							className="flex w-full min-w-[9rem] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label="Select transaction type"
						>
							<SelectValue placeholder="Outgoing transactions" />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="outgoing" className="rounded-lg">
								Outgoing transactions
							</SelectItem>
							<SelectItem value="incoming" className="rounded-lg">
								Incoming transactions
							</SelectItem>
						</SelectContent>
					</Select>
					<ToggleGroup
						type="single"
						value={metric}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setMetric(value as ChartMetric);
						}}
						variant="outline"
						className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
					>
						<ToggleGroupItem value="count">Count</ToggleGroupItem>
						<ToggleGroupItem value="amount">Amount</ToggleGroupItem>
					</ToggleGroup>
					<Select
						value={metric}
						onValueChange={(value) => {
							if (!value) {
								return;
							}
							setMetric(value as ChartMetric);
						}}
					>
						<SelectTrigger
							className="flex w-full min-w-[9rem] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
							size="sm"
							aria-label="Select a metric"
						>
							<SelectValue placeholder={METRIC_LABELS.amount} />
						</SelectTrigger>
						<SelectContent className="rounded-xl">
							<SelectItem value="count" className="rounded-lg">
								{METRIC_LABELS.count}
							</SelectItem>
							<SelectItem value="amount" className="rounded-lg">
								{METRIC_LABELS.amount}
							</SelectItem>
						</SelectContent>
					</Select>
				</CardAction>
			</CardHeader>
			<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
				<ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
					<AreaChart data={chartRows}>
						<defs>
							{series.map((item) => (
								<linearGradient key={item.key} id={`fill-${item.key}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="5%" stopColor={`var(--color-${item.key})`} stopOpacity={0.8} />
									<stop offset="95%" stopColor={`var(--color-${item.key})`} stopOpacity={0.1} />
								</linearGradient>
							))}
						</defs>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="date"
							tickLine={false}
							axisLine={false}
							tickMargin={8}
							minTickGap={32}
							tickFormatter={(value) => {
								const date = new Date(value);
								return date.toLocaleDateString("en-GB", {
									month: "short",
									day: "numeric",
								});
							}}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									labelFormatter={(value) => {
										return new Date(value).toLocaleDateString("en-GB", {
											month: "short",
											day: "numeric",
										});
									}}
									indicator="dot"
								/>
							}
						/>
						{series.map((item) => (
							<Area
								key={item.key}
								dataKey={item.key}
								type="natural"
								fill={`url(#fill-${item.key})`}
								stroke={`var(--color-${item.key})`}
								stackId="a"
							/>
						))}
					</AreaChart>
				</ChartContainer>
				{!isLoading && !error && !series.length ? (
					<p className="text-muted-foreground mt-4 text-sm">
						No {typeLabelLower} transactions found for the selected period.
					</p>
				) : null}
				{error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
			</CardContent>
		</Card>
	);
}
