import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { getSession } from "@/lib/session";

export default async function SignInPage() {
  if (await getSession()) redirect("/");

  return (
    <main className="mx-auto flex max-w-md flex-col items-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Job tracker</h1>
      <SignInButton />
    </main>
  );
}
