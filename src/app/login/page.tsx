import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

type ResolvedSearchParams =
	| Record<string, string | string[] | undefined>
	| URLSearchParams
	| { get?: (name: string) => string | null };

type SignInPageProps = {
	searchParams?: Promise<ResolvedSearchParams>;
};

const getEmailConfirmedValue = (params: ResolvedSearchParams | null | undefined): string | undefined => {
	if (!params) return undefined;

	if (params instanceof URLSearchParams) {
		return params.get("emailConfirmed") ?? undefined;
	}

	if (typeof params.get === "function") {
		return params.get("emailConfirmed") ?? undefined;
	}

	const value = (params as Record<string, string | string[] | undefined>)["emailConfirmed"];
	return Array.isArray(value) ? value[0] : value;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
	const resolvedSearchParams = (await searchParams) ?? null;
	const emailConfirmed = getEmailConfirmedValue(resolvedSearchParams) === "1";

	return <SignInForm emailConfirmed={emailConfirmed} />;
}
