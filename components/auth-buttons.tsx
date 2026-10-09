"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  return (
    <button
      type="button"
      onClick={() =>
        authClient.signIn.social({ provider: "github", callbackURL: "/" })
      }
      className="rounded bg-black px-4 py-2 text-sm text-white"
    >
      Sign in with GitHub
    </button>
  );
}

export function SignOutButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() =>
        authClient.signOut({
          fetchOptions: { onSuccess: () => router.push("/sign-in") },
        })
      }
      className="text-sm text-gray-500"
    >
      Sign out
    </button>
  );
}
