"use client";

import { useTransition } from "react";
import { updateStatus } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/statuses";

export function StatusSelect({ id, status }: { id: number; status: Status }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value;
        startTransition(async () => {
          await updateStatus(id, next);
        });
      }}
      className="rounded border px-2 py-1 disabled:opacity-50"
    >
      {STATUSES.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
