import {
  CalendarCheckIcon,
  CircleAlertIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { SignInButton } from "@/components/auth-buttons";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSession } from "@/lib/session";
import { STATUSES, type Status } from "@/lib/statuses";

const errorMessages: Record<string, string> = {
  email_not_found:
    "GitHub didn't share an email address. Allow access to your email and try again.",
};

const statusHints: Record<Status, string> = {
  wishlist: "Roles you want to apply for",
  applied: "Sent and waiting to hear back",
  interview: "In talks with the team",
  offer: "An offer on the table",
  rejected: "Closed, on to the next one",
};

const features = [
  {
    icon: SparklesIcon,
    title: "Autofill from a posting",
    description:
      "Paste a job posting and AI fills in the company and position.",
  },
  {
    icon: SearchIcon,
    title: "Search and filter",
    description: "Find any application by company, position or status.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Applied dates kept for you",
    description: "The date is set when an application leaves your wishlist.",
  },
];

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSession()) redirect("/");

  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Job tracker</h1>
          <p className="text-muted-foreground">
            Track every application from wishlist to offer.
          </p>
        </div>
        <SignInButton />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertTitle>
            {errorMessages[error] ?? "Sign-in failed. Please try again."}
          </AlertTitle>
        </Alert>
      )}

      <section aria-labelledby="statuses" className="mb-8">
        <h2 id="statuses" className="sr-only">
          Statuses
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATUSES.map((status) => (
            <Card key={status} size="sm">
              <CardHeader>
                <CardDescription className="capitalize">
                  {status}
                </CardDescription>
                <CardTitle>{statusHints[status]}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="features">
        <h2 id="features" className="mb-3 text-lg font-semibold">
          What you get
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} size="sm">
              <CardHeader>
                <Icon className="mb-1 size-4 text-muted-foreground" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
