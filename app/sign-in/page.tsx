import { CircleAlertIcon } from "lucide-react";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <main className="mx-auto w-full max-w-sm p-8">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1>Job tracker</h1>
          </CardTitle>
          <CardDescription>
            Sign in to track your job applications.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>
                {errorMessages[error] ?? "Sign-in failed. Please try again."}
              </AlertTitle>
            </Alert>
          )}
          <SignInButton />
        </CardContent>
      </Card>
    </main>
  );
}
