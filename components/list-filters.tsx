"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { STATUSES } from "@/lib/statuses";

export function ListFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [status, setOptimisticStatus] = useOptimistic(
    searchParams.get("status") ?? "",
  );
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  function buildUrl(changes: { q?: string; status?: string }) {
    const params = new URLSearchParams(searchParams);

    // A new filter starts again from the first page.
    params.delete("after");
    params.delete("before");

    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    const queryString = params.toString();
    return queryString ? `/?${queryString}` : "/";
  }

  function changeQuery(value: string) {
    setQuery(value);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      startTransition(() => router.replace(buildUrl({ q: value.trim() })));
    }, 300);
  }

  function changeStatus(value: string) {
    startTransition(() => {
      setOptimisticStatus(value);
      router.replace(buildUrl({ status: value }));
    });
  }

  return (
    <div className="mb-4 flex items-center gap-3 text-sm">
      <input
        type="search"
        value={query}
        onChange={(event) => changeQuery(event.target.value)}
        placeholder="Search company or position"
        className="w-64 rounded border px-3 py-2"
      />

      <select
        value={status}
        onChange={(event) => changeStatus(event.target.value)}
        className="rounded border px-3 py-2"
      >
        <option value="">All statuses</option>
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {isPending && <span className="text-gray-500">Loading…</span>}
    </div>
  );
}
