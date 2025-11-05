"use client";

import { useMemo, useState, useEffect } from "react";
import type { CurrencyResponse } from "@/db/queries/currencies";

type CurrencyPickerProps = {
	currencies: CurrencyResponse[];
};

function formatCurrencyLabel(currency: CurrencyResponse) {
	return `${currency.name} (${currency.isoCode})`;
}

function normalise(value: string) {
	return value.trim().toLowerCase();
}

export function CurrencyPicker({ currencies }: CurrencyPickerProps) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<CurrencyResponse | null>(null);

	useEffect(() => {
		if (selected) {
			setQuery(formatCurrencyLabel(selected));
		}
	}, [selected]);

	const filtered = useMemo(() => {
		const normalisedQuery = normalise(query);
		if (!normalisedQuery) {
			return currencies.slice(0, 8);
		}
		return currencies
			.filter((currency) => {
				const haystack = [currency.name, currency.isoCode, currency.symbol]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return haystack.includes(normalisedQuery);
			})
			.slice(0, 8);
	}, [currencies, query]);

	return (
		<div className="grid gap-2">
			<input type="hidden" name="currencyId" value={selected?.id ?? ""} />
			<div className="relative">
				<input
					type="text"
					className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200"
					placeholder="Search currency (e.g. USD, Euro)"
					autoComplete="off"
					value={query}
					role="combobox"
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-autocomplete="list"
					aria-controls="currency-picker-list"
					onFocus={() => setOpen(true)}
					onChange={(event) => {
						setQuery(event.target.value);
						setSelected(null);
						setOpen(true);
					}}
					onBlur={(event) => {
						if (!event.currentTarget.contains(event.relatedTarget)) {
							setOpen(false);
						}
					}}
				/>
				{open ? (
					<div className="absolute z-30 mt-2 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
						{filtered.length === 0 ? (
							<p className="px-3 py-2 text-sm text-gray-400">
								No currencies match “{query.trim()}”
							</p>
						) : (
							<ul
								id="currency-picker-list"
								role="listbox"
								className="max-h-48 overflow-y-auto text-sm"
							>
								{filtered.map((currency) => (
									<li key={currency.id}>
										<button
											type="button"
											role="option"
											aria-selected={selected?.id === currency.id}
											className="flex w-full flex-col items-start gap-1 px-3 py-2 text-left hover:bg-emerald-50 focus:bg-emerald-50"
											onMouseDown={(event) => {
												event.preventDefault();
											}}
											onClick={() => {
												setSelected(currency);
												setOpen(false);
											}}
										>
											<span className="font-medium text-gray-900">
												{formatCurrencyLabel(currency)}
											</span>
											<span className="text-xs text-gray-500">
												{currency.symbol ? `Symbol ${currency.symbol}` : "No symbol available"}
											</span>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				) : null}
			</div>
			<p className="text-xs text-gray-500">
				{selected
					? `Selected currency: ${formatCurrencyLabel(selected)}`
					: "Choose the currency to store balances in."}
			</p>
		</div>
	);
}
