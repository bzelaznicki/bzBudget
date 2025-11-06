import { Inbound } from "@inboundemail/sdk";

export const inbound = new Inbound(process.env.INBOUND_API_KEY!);
const fromField = process.env.INBOUND_FROM_FIELD;

export async function sendConfirmationEmail(email: string, name: string, link: string) {

	if (!fromField) throw new Error("INBOUND_FROM_FIELD must be set");
	const { data, error } = await inbound.emails.send(
		{
			from: fromField,
			to: email,
			subject: "Complete your bzBudget registration",
			html: `<p>Hello, ${name}!</p>
				<p>Thank you for registering! Confirm your email by clicking below:</p>
				<p><a href="${link}" alt="Confirmation link">Link</a></p>
				
				<p>Thanks,</p>
				<p>bzBudget Team</p>`,
		}
	)

	if (error) {
		throw new Error(error);
	} else {
		return data;
	}

}
