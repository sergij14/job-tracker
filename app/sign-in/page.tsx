import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { getSession } from "@/lib/session";

const errorMessages: Record<string, string> = {
  email_not_found:
    "GitHub didn't share an email address. Allow access to your email and try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Job tracker</h1>
      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessages[error] ?? "Sign-in failed. Please try again."}
        </p>
      )}
      <SignInButton />
    </main>
  );
}
