"use client";

import Link from "next/link";
import { Fragment, useActionState, useRef } from "react";
import { PostingAutofill } from "@/components/posting-autofill";
import { STATUSES } from "@/lib/statuses";
import type { FormState, FormValues } from "@/lib/validation";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: FormValues;
  autofill?: boolean;
  submitLabel: string;
};

const inputClass = "rounded border px-3 py-2";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-sm text-red-600">{messages[0]}</p>;
}

export function ApplicationForm({
  action,
  initialValues,
  submitLabel,
  autofill,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;

  const companyRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLInputElement>(null);

  return (
    <Fragment>
      {autofill && (
        <PostingAutofill
          onExtract={({ company, position }) => {
            if (companyRef.current) companyRef.current.value = company;
            if (positionRef.current) positionRef.current.value = position;
          }}
        />
      )}
      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Company
          <input
            ref={companyRef}
            name="company"
            required
            defaultValue={values?.company}
            className={inputClass}
          />
          <FieldError messages={state.errors?.company} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Position
          <input
            ref={positionRef}
            name="position"
            required
            defaultValue={values?.position}
            className={inputClass}
          />
          <FieldError messages={state.errors?.position} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Job posting URL
          <input
            name="url"
            type="url"
            defaultValue={values?.url}
            className={inputClass}
          />
          <FieldError messages={state.errors?.url} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue={values?.status ?? "wishlist"}
            className={inputClass}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <FieldError messages={state.errors?.status} />
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isPending}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isPending ? "Saving…" : submitLabel}
          </button>
          <Link href="/" className="text-sm text-gray-500">
            Cancel
          </Link>
        </div>
      </form>
    </Fragment>
  );
}
