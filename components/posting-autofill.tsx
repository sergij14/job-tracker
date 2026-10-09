"use client";

import { useState, useTransition } from "react";
import { extractFromPosting } from "@/app/ai-actions";
import { MAX_INPUT_CHARS } from "@/lib/ai-limits";

export function PostingAutofill({
  onExtract,
}: {
  onExtract: (values: { company: string; position: string }) => void;
}) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await extractFromPosting(text);

      if (!result.ok) {
        setMessage(result.error);
        return;
      }

      onExtract(result);
      setMessage(`Filled in. ${result.remaining} autofills left today.`);
    });
  }

  return (
    <div className="mb-6 flex flex-col gap-2 rounded border p-4 text-sm">
      <label className="flex flex-col gap-1">
        Paste a job posting to fill in the form
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_INPUT_CHARS}
          rows={5}
          className="rounded border px-3 py-2"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={isPending || text.trim().length === 0}
          className="rounded border px-3 py-1 disabled:opacity-50"
        >
          {isPending ? "Reading…" : "Autofill with AI"}
        </button>
        {message && <span className="text-gray-600">{message}</span>}
      </div>
    </div>
  );
}
