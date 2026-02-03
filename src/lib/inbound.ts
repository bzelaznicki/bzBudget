import { Inbound } from "@inboundemail/sdk";

export const inbound = new Inbound(process.env.INBOUND_API_KEY!);
const fromField = process.env.INBOUND_FROM_FIELD;

export async function sendConfirmationEmail(email: string, name: string, link: string) {
	if (!fromField) throw new Error("INBOUND_FROM_FIELD must be set");
	const firstName = name.trim().split(" ")[0] || "there";
	const htmlBody = `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:40px 48px;text-align:left;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
						<tr>
							<td style="text-align:center;">
								<p style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;font-weight:600;color:#6366f1;margin:0;">bzBudget</p>
								<h1 style="font-size:28px;margin:12px 0 8px;font-weight:700;color:#0f172a;">You're almost in, ${firstName}! 🎉</h1>
								<p style="font-size:16px;line-height:1.6;margin:0;color:#475467;">Confirm your email and unlock your new command center for mindful spending.</p>
							</td>
						</tr>
						<tr>
							<td>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
									<tr>
										<td align="center">
											<a href="${link}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:16px;">Confirm my email</a>
										</td>
									</tr>
									<tr>
										<td style="padding-top:16px;text-align:center;font-size:13px;color:#94a3b8;">The link expires in 30 minutes for your security.</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:16px;font-weight:600;margin:0 0 12px;">What happens next?</p>
								<ul style="padding-left:20px;margin:0 0 20px;color:#475467;font-size:15px;line-height:1.6;">
									<li>Connect your accounts and see every subscription in one spot.</li>
									<li>Plan the month ahead with intention—not guesswork.</li>
									<li>Celebrate the small wins as your savings stack up.</li>
								</ul>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">Having trouble with the button? Paste this link into your browser:</p>
								<p style="margin:0 0 16px;">
									<a href="${link}" style="color:#6366f1;display:inline-block;max-width:100%;word-break:break-all;word-wrap:break-word;text-decoration:none;">${link}</a>
								</p>
								<p style="font-size:15px;color:#475467;margin:0 0 4px;">See you inside,</p>
								<p style="font-weight:600;color:#0f172a;margin:0;">The bzBudget Crew</p>
								<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">Need help? Reply to this email and we'll jump in.</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	`;
	const { data, error } = await inbound.emails.send({
		from: fromField,
		to: email,
		subject: "You're almost there! Confirm your bzBudget account",
		html: htmlBody,
	});

	if (error) {
		throw new Error(error);
	} else {
		return data;
	}
}

export async function sendResetPasswordEmail(email: string, name: string, link: string) {
	if (!fromField) throw new Error("INBOUND_FROM_FIELD must be set");
	const firstName = name.trim().split(" ")[0] || "there";
	const htmlBody = `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:40px 48px;text-align:left;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
						<tr>
							<td style="text-align:center;">
								<p style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;font-weight:600;color:#6366f1;margin:0;">bzBudget</p>
								<h1 style="font-size:28px;margin:12px 0 8px;font-weight:700;color:#0f172a;">Need a fresh start, ${firstName}?</h1>
								<p style="font-size:16px;line-height:1.6;margin:0;color:#475467;">Reset your password and jump right back into planning your money with intention.</p>
							</td>
						</tr>
						<tr>
							<td>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;">
									<tr>
										<td align="center">
											<a href="${link}" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:16px;">Reset my password</a>
										</td>
									</tr>
									<tr>
										<td style="padding-top:16px;text-align:center;font-size:13px;color:#94a3b8;">The link expires in 30 minutes to keep your account secure.</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">If you didn't request this, you can safely ignore it—your password stays the same.</p>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">Need the link again? Just head back to the reset form and we'll send a fresh one.</p>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">Having trouble with the button? Paste this link into your browser:</p>
								<p style="margin:0 0 16px;">
									<a href="${link}" style="color:#6366f1;display:inline-block;max-width:100%;word-break:break-all;word-wrap:break-word;text-decoration:none;">${link}</a>
								</p>
								<p style="font-size:15px;color:#475467;margin:0 0 4px;">We're here if you need anything,</p>
								<p style="font-weight:600;color:#0f172a;margin:0;">The bzBudget Crew</p>
								<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">Need help? Reply to this email and we'll jump in.</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	`;
	const { data, error } = await inbound.emails.send({
		from: fromField,
		to: email,
		subject: "Reset your bzBudget password",
		html: htmlBody,
	});

	if (error) {
		throw new Error(error);
	} else {
		return data;
	}
}

export async function sendBudgetThresholdAlert(
	email: string,
	name: string,
	categoryName: string,
	period: string,
	budgetAmount: number,
	currentSpending: number,
	threshold: number,
) {
	if (!fromField) throw new Error("INBOUND_FROM_FIELD must be set");
	const firstName = name.trim().split(" ")[0] || "there";
	const formattedBudget = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(budgetAmount);
	const formattedSpending = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(currentSpending);

	const htmlBody = `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:40px 48px;text-align:left;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
						<tr>
							<td style="text-align:center;">
								<p style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;font-weight:600;color:#f59e0b;margin:0;">Budget Alert</p>
								<h1 style="font-size:28px;margin:12px 0 8px;font-weight:700;color:#0f172a;">You're approaching your limit, ${firstName}</h1>
								<p style="font-size:16px;line-height:1.6;margin:0;color:#475467;">You've spent ${formattedSpending} of your ${formattedBudget} ${period} ${categoryName} budget.</p>
							</td>
						</tr>
						<tr>
							<td>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;background:#fef3c7;border-radius:12px;padding:24px;">
									<tr>
										<td style="text-align:center;">
											<p style="font-size:14px;color:#92400e;margin:0 0 8px;">You're at ${threshold}% of your budget</p>
											<div style="background:#fde68a;height:8px;border-radius:4px;overflow:hidden;">
												<div style="background:#f59e0b;width:${Math.min(threshold, 100)}%;height:100%;"></div>
											</div>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">Want to stay on track? Check your dashboard to see where your money is going and adjust if needed.</p>
								<p style="margin:0 0 16px;text-align:center;">
									<a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bzbudget.app"}/dashboard" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:16px;">View Dashboard</a>
								</p>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;margin:0 0 4px;">Keep an eye on those goals,</p>
								<p style="font-weight:600;color:#0f172a;margin:0;">The bzBudget Crew</p>
								<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">You're receiving this because you enabled budget alerts. You can manage alerts in your settings.</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	`;

	const { data, error } = await inbound.emails.send({
		from: fromField,
		to: email,
		subject: `Budget Alert: You've spent ${threshold}% of your ${categoryName} budget`,
		html: htmlBody,
	});

	if (error) {
		throw new Error(error);
	} else {
		return data;
	}
}

export async function sendBudgetExceededAlert(
	email: string,
	name: string,
	categoryName: string,
	period: string,
	budgetAmount: number,
	currentSpending: number,
) {
	if (!fromField) throw new Error("INBOUND_FROM_FIELD must be set");
	const firstName = name.trim().split(" ")[0] || "there";
	const formattedBudget = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(budgetAmount);
	const formattedSpending = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(currentSpending);
	const overspend = currentSpending - budgetAmount;
	const formattedOverspend = new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(overspend);

	const htmlBody = `
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;padding:40px 48px;text-align:left;box-shadow:0 8px 30px rgba(15,23,42,0.08);">
						<tr>
							<td style="text-align:center;">
								<p style="text-transform:uppercase;letter-spacing:0.08em;font-size:12px;font-weight:600;color:#ef4444;margin:0;">Budget Exceeded</p>
								<h1 style="font-size:28px;margin:12px 0 8px;font-weight:700;color:#0f172a;">Budget limit reached, ${firstName}</h1>
								<p style="font-size:16px;line-height:1.6;margin:0;color:#475467;">You've spent ${formattedSpending} of your ${formattedBudget} ${period} ${categoryName} budget.</p>
							</td>
						</tr>
						<tr>
							<td>
								<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:32px 0;background:#fee2e2;border-radius:12px;padding:24px;">
									<tr>
										<td style="text-align:center;">
											<p style="font-size:14px;color:#991b1b;margin:0 0 8px;">You've exceeded your budget by ${formattedOverspend}</p>
											<div style="background:#fecaca;height:8px;border-radius:4px;overflow:hidden;">
												<div style="background:#ef4444;width:100%;height:100%;"></div>
											</div>
										</td>
									</tr>
								</table>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;line-height:1.6;margin:0 0 16px;">Time to review your spending? Check your dashboard to see what's pushing you over and adjust your budget or habits.</p>
								<p style="margin:0 0 16px;text-align:center;">
									<a href="${process.env.NEXT_PUBLIC_APP_URL || "https://bzbudget.app"}/dashboard" style="display:inline-block;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:999px;font-size:16px;">View Dashboard</a>
								</p>
							</td>
						</tr>
						<tr>
							<td>
								<p style="font-size:15px;color:#475467;margin:0 0 4px;">We're here to help you stay on track,</p>
								<p style="font-weight:600;color:#0f172a;margin:0;">The bzBudget Crew</p>
								<p style="font-size:12px;color:#94a3b8;margin:16px 0 0;">You're receiving this because you enabled budget alerts. You can manage alerts in your settings.</p>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	`;

	const { data, error } = await inbound.emails.send({
		from: fromField,
		to: email,
		subject: `Budget Exceeded: You've gone over your ${categoryName} budget`,
		html: htmlBody,
	});

	if (error) {
		throw new Error(error);
	} else {
		return data;
	}
}
