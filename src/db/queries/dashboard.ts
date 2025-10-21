export type DashboardSummary = {
	income: {
		current: number;
		previous: number;
	};
	expenses: {
		current: number;
		previous: number;
	};
	net: {
		current: number;
		previous: number;
	};
	transactions: {
		current: number;
		previous: number;
	};
	accounts: {
		total: number;
		newThisMonth: number;
	};
	currency: {
		isoCode: string;
		symbol: string;
		position: "before" | "after";
	};
};

const fallbackSummary: DashboardSummary = {
	income: { current: 12450.32, previous: 11210.45 },
	expenses: { current: 8250.76, previous: 7933.18 },
	net: { current: 4200.56, previous: 3277.27 },
	transactions: { current: 182, previous: 165 },
	accounts: { total: 6, newThisMonth: 2 },
	currency: { isoCode: "USD", symbol: "$", position: "before" },
};

export async function getDashboardSummary(
	_userId: string,
): Promise<DashboardSummary> {
	// Simulate the shape of a future asynchronous call while real data hooks
	// are being implemented.
	await new Promise((resolve) => setTimeout(resolve, 25));
	return fallbackSummary;
}
