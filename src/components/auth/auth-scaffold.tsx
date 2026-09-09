import { IconCheck, IconCoins } from "@tabler/icons-react";

interface Benefit {
	title: string;
	description: string;
}

interface AuthScaffoldProps {
	highlight: string;
	title: string;
	description: string;
	benefits: Benefit[];
	children: React.ReactNode;
	footer?: React.ReactNode;
}

/**
 * Warm Ledger auth shell: sunk brand panel on the left carrying the promise, the form
 * on the right. Replaces the marketing gradient the app used to open with.
 */
export function AuthScaffold({
	highlight,
	title,
	description,
	benefits,
	children,
	footer,
}: AuthScaffoldProps) {
	return (
		<div className="bg-background min-h-screen px-4 py-8 md:px-6 md:py-12">
			<div className="border-border mx-auto grid w-full max-w-5xl overflow-hidden rounded-[20px] border shadow-[0_1px_3px_rgba(0,0,0,.1)] md:grid-cols-[1.05fr_1fr]">
				<div className="bg-sunk border-border flex flex-col gap-6 border-b p-10 md:border-r md:border-b-0 md:p-11">
					<div className="flex items-center gap-2.5">
						<span className="bg-income flex size-6.5 items-center justify-center rounded-lg text-white">
							<IconCoins className="size-4" />
						</span>
						<span className="text-[15px] font-semibold">bzBudget</span>
					</div>

					<div>
						<span className="text-eyebrow text-[11.5px]">{highlight}</span>
						<h1 className="text-money mt-2 text-[40px] leading-tight">{title}</h1>
						<p className="text-secondary-foreground mt-2.5 max-w-[38ch] text-[14.5px]">
							{description}
						</p>
					</div>

					<ul className="flex flex-col gap-3.5">
						{benefits.map((benefit) => (
							<li key={benefit.title} className="flex gap-3">
								<span className="bg-income mt-0.5 flex size-4.5 flex-none items-center justify-center rounded-md text-white">
									<IconCheck className="size-3" />
								</span>
								<div className="leading-snug">
									<p className="text-sm font-medium">{benefit.title}</p>
									<p className="text-muted-foreground text-sm">{benefit.description}</p>
								</div>
							</li>
						))}
					</ul>

					{footer ? (
						<div className="text-muted-foreground mt-auto pt-2 text-[12.5px]">{footer}</div>
					) : null}
				</div>

				<div className="bg-card flex flex-col justify-center p-10 md:p-11">
					<div className="w-full">{children}</div>
				</div>
			</div>
		</div>
	);
}
