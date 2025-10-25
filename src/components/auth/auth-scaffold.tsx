import { CheckCircle2 } from "lucide-react"

interface Benefit {
	title: string
	description: string
}

interface AuthScaffoldProps {
	highlight: string
	title: string
	description: string
	benefits: Benefit[]
	children: React.ReactNode
	footer?: React.ReactNode
}

export function AuthScaffold({
	highlight,
	title,
	description,
	benefits,
	children,
	footer,
}: AuthScaffoldProps) {
	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 px-6 py-12">
			<div className="mx-auto grid w-full max-w-5xl items-center gap-12 rounded-[28px] bg-white/70 p-8 shadow-2xl shadow-emerald-100 backdrop-blur-xl md:grid-cols-[1.15fr_1fr] md:p-12">
				<div className="flex flex-col justify-center space-y-8">
					<span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-700">
						{highlight}
					</span>
					<div className="space-y-4">
						<h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">{title}</h1>
						<p className="text-base text-gray-600 md:text-lg">{description}</p>
					</div>
					<ul className="space-y-4">
						{benefits.map((benefit) => (
							<li key={benefit.title} className="flex gap-3">
								<span className="mt-1 rounded-full bg-emerald-100 p-1 text-emerald-600">
									<CheckCircle2 className="h-4 w-4" />
								</span>
								<div>
									<p className="text-sm font-medium text-gray-900 md:text-base">{benefit.title}</p>
									<p className="text-sm text-gray-500">{benefit.description}</p>
								</div>
							</li>
						))}
					</ul>
					{footer ? <div className="pt-2 text-sm text-gray-500">{footer}</div> : null}
				</div>
				<div className="flex items-center justify-center md:justify-end">
					<div className="w-full max-w-md lg:max-w-sm">{children}</div>
				</div>
			</div>
		</div>
	)
}
