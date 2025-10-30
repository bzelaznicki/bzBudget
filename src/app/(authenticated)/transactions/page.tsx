import { SiteHeader } from "@/components/site-header";
import { TransactionsDataTable } from "@/components/transactions-data-table";




export default function TransactionsPage() {
	return (
		<>
			<SiteHeader title="Transactions" />
			<div className="mx-auto mt-6 w-full max-w-6xl px-4 pb-6 sm:px-6 lg:px-8">
				<TransactionsDataTable />
			</div>
		</>
	);
}
