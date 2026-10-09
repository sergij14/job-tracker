"use client";

import { SparklesIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { extractFromPosting } from "@/app/ai-actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { MAX_INPUT_CHARS } from "@/lib/ai-limits";

export function PostingAutofill({
  onExtract,
}: {
  onExtract: (values: { company: string; position: string }) => void;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = await extractFromPosting(text);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      onExtract(result);
      toast.success(`Filled in. ${result.remaining} autofills left today.`);
    });
  }

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="posting">Paste a job posting</FieldLabel>
        <Textarea
          id="posting"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={MAX_INPUT_CHARS}
          className="max-h-60"
        />
        <FieldDescription>
          AI reads the posting and fills in the company and position.
        </FieldDescription>
      </Field>
      <Field orientation="horizontal">
        <Button
          type="button"
          variant="outline"
          onClick={run}
          disabled={isPending || text.trim().length === 0}
        >
          {isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          Autofill with AI
        </Button>
      </Field>
    </FieldGroup>
  );
}
