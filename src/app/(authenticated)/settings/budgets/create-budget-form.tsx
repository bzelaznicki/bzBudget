"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type { CategoryResponse } from "@/db/queries/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type CreateBudgetFormProps = {
	categories: CategoryResponse[];
};

export function CreateBudgetForm({ categories }: CreateBudgetFormProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const [amount, setAmount] = React.useState("");
	const [period, setPeriod] = React.useState<"weekly" | "monthly" | "yearly">("monthly");
	const [categoryId, setCategoryId] = React.useState<string>("");
	const [alertThreshold, setAlertThreshold] = React.useState(80);
	const [emailAlerts, setEmailAlerts] = React.useState(true);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const numAmount = parseFloat(amount);
		if (Number.isNaN(numAmount) || numAmount <= 0) {
			toast.error("Please enter a valid amount greater than 0");
			return;
		}

		setIsSubmitting(true);

		try {
			const res = await fetch("/api/budgets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					amount: numAmount,
					period,
					alertThreshold,
					emailAlerts,
					categoriesId: categoryId || null,
				}),
			});

			if (!res.ok) {
				let errorMessage = "Failed to create budget";
				try {
					const data = await res.json();
					if (data && typeof data === "object" && "error" in data) {
						const message = (data as { error?: unknown }).error;
						if (typeof message === "string" && message.trim().length > 0) {
							errorMessage = message;
						}
					}
				} catch {
					// ignore JSON parsing errors
				}
				throw new Error(errorMessage);
			}

			toast.success("Budget created successfully");
			setAmount("");
			setCategoryId("");
			setAlertThreshold(80);
			setEmailAlerts(true);
			setPeriod("monthly");
			router.refresh();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to create budget";
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="grid gap-4">
			<div className="grid gap-2">
				<Label htmlFor="budget-category">Category</Label>
				<Select value={categoryId} onValueChange={setCategoryId}>
					<SelectTrigger id="budget-category">
						<SelectValue placeholder="Overall budget (all spending)" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">Overall budget (all spending)</SelectItem>
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="budget-amount">Budget Amount</Label>
				<Input
					id="budget-amount"
					type="number"
					min="0.01"
					step="0.01"
					placeholder="e.g. 500.00"
					value={amount}
					onChange={(e) => setAmount(e.target.value)}
					required
				/>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="budget-period">Period</Label>
				<Select
					value={period}
					onValueChange={(value: "weekly" | "monthly" | "yearly") => setPeriod(value)}
				>
					<SelectTrigger id="budget-period">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="weekly">Weekly</SelectItem>
						<SelectItem value="monthly">Monthly</SelectItem>
						<SelectItem value="yearly">Yearly</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="grid gap-2">
				<Label htmlFor="budget-threshold">Alert Threshold ({alertThreshold}%)</Label>
				<Slider
					id="budget-threshold"
					min={1}
					max={100}
					step={1}
					value={[alertThreshold]}
					onValueChange={(value: number[]) => setAlertThreshold(value[0])}
				/>
				<p className="text-xs text-gray-500">
					We'll send you an email when you reach {alertThreshold}% of your budget
				</p>
			</div>

			<div className="flex items-center space-x-2">
				<Switch id="budget-email-alerts" checked={emailAlerts} onCheckedChange={setEmailAlerts} />
				<Label htmlFor="budget-email-alerts">Enable email alerts</Label>
			</div>

			<Button type="submit" variant="default" className="w-full" disabled={isSubmitting}>
				{isSubmitting ? "Creating..." : "Create budget"}
			</Button>
		</form>
	);
}
