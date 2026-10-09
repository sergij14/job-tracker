"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md p-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            {"We couldn't load this page. Please try again."}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => retry())}
          >
            {isPending && <Spinner data-icon="inline-start" />}
            Try again
          </Button>
          {error.digest && (
            <EmptyDescription>Reference: {error.digest}</EmptyDescription>
          )}
        </EmptyContent>
      </Empty>
    </main>
  );
}
