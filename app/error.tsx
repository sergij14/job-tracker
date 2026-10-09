"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Something went wrong</h1>
      <p className="mb-6 text-gray-500">
        {"We couldn't load this page. Please try again."}
      </p>
      {error.digest && (
        <p className="mb-6 text-xs text-gray-400">Reference: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={retry}
        className="rounded bg-black px-4 py-2 text-sm text-white"
      >
        Try again
      </button>
    </main>
  );
}
