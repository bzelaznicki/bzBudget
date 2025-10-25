"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";
import { toast } from "sonner";

export function SignOutButton() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleSignOut = async () => {
		setLoading(true);
		try {
			await signOut();
			router.push("/login");
		} catch (error) {
			toast.error("Unable to sign out. Please try again.");
			console.error(error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Button
			type="button"
			variant="outline"
			className="gap-2 shadow-sm"
			disabled={loading}
			onClick={handleSignOut}
		>
			{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
			<span>{loading ? "Signing out" : "Sign out"}</span>
		</Button>
	);
}
