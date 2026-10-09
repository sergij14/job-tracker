"use client";

import { deleteApplication } from "@/app/actions";

export function DeleteButton({ id }: { id: number }) {
  return (
    <form
      action={deleteApplication.bind(null, id)}
      onSubmit={(event) => {
        if (!confirm("Delete this application?")) event.preventDefault();
      }}
    >
      <button type="submit" className="text-red-600">
        Delete
      </button>
    </form>
  );
}
