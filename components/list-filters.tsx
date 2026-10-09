"use client";

import { SearchIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
    return queryString ? `/applications?${queryString}` : "/applications";
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
    <div className="mb-4 flex items-center gap-3">
      <InputGroup className="w-64">
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search company or position"
          aria-label="Search company or position"
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>

      <Select
        value={status || null}
        onValueChange={(value) => changeStatus(value ?? "")}
      >
        <SelectTrigger aria-label="Filter by status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>All statuses</SelectItem>
          {STATUSES.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && <Spinner className="text-muted-foreground" />}
    </div>
  );
}
