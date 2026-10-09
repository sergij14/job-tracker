"use client";

import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { deleteApplication, updateStatus } from "@/app/actions";
import { STATUSES, type Status } from "@/lib/statuses";

export type ApplicationRow = {
  id: number;
  company: string;
  position: string;
  status: Status;
  appliedAt: string | null;
  pending?: boolean;
};

type OptimisticAction =
  | { type: "status"; id: number; status: Status }
  | { type: "delete"; id: number };

function applyAction(
  rows: ApplicationRow[],
  action: OptimisticAction,
): ApplicationRow[] {
  switch (action.type) {
    case "status":
      return rows.map((row) =>
        row.id === action.id
          ? { ...row, status: action.status, pending: true }
          : row,
      );
    case "delete":
      return rows.filter((row) => row.id !== action.id);
  }
}

export function ApplicationsTable({ rows }: { rows: ApplicationRow[] }) {
  const [optimisticRows, addOptimistic] = useOptimistic(rows, applyAction);
  const [error, setError] = useState<string | null>(null);

  function changeStatus(id: number, status: Status) {
    setError(null);
    startTransition(async () => {
      addOptimistic({ type: "status", id, status });
      try {
        await updateStatus(id, status);
      } catch {
        setError("Could not update the status. The change was reverted.");
      }
    });
  }

  function remove(id: number) {
    if (!confirm("Delete this application?")) return;

    setError(null);
    startTransition(async () => {
      addOptimistic({ type: "delete", id });
      try {
        await deleteApplication(id);
      } catch {
        setError("Could not delete the application. It was restored.");
      }
    });
  }

  if (optimisticRows.length === 0) {
    return <p className="text-gray-500">No applications yet.</p>;
  }

  return (
    <>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <table className="w-full text-left text-sm">
        <thead className="border-b text-gray-500">
          <tr>
            <th className="py-2">Company</th>
            <th className="py-2">Position</th>
            <th className="py-2">Status</th>
            <th className="py-2">Applied</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {optimisticRows.map((row) => (
            <tr
              key={row.id}
              className={`border-b ${row.pending ? "opacity-60" : ""}`}
            >
              <td className="py-2">{row.company}</td>
              <td className="py-2">{row.position}</td>
              <td className="py-2">
                <select
                  value={row.status}
                  onChange={(event) =>
                    changeStatus(row.id, event.target.value as Status)
                  }
                  className="rounded border px-2 py-1"
                >
                  {STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-2">{row.appliedAt ?? "-"}</td>
              <td className="py-2">
                <div className="flex items-center justify-end gap-4">
                  <Link
                    href={`/applications/${row.id}/edit`}
                    className="text-gray-600"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(row.id)}
                    className="text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
