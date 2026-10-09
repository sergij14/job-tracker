"use client";

import Link from "next/link";
import { Fragment, useActionState, useRef, useState } from "react";
import { PostingAutofill } from "@/components/posting-autofill";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { STATUSES } from "@/lib/statuses";
import type { FormState, FormValues } from "@/lib/validation";

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  initialValues?: FormValues;
  autofill?: boolean;
  submitLabel: string;
};

export function ApplicationForm({
  action,
  initialValues,
  submitLabel,
  autofill,
}: Props) {
  const [state, formAction, isPending] = useActionState(action, {});
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};
  const [status, setStatus] = useState(initialValues?.status ?? "wishlist");

  const companyRef = useRef<HTMLInputElement>(null);
  const positionRef = useRef<HTMLInputElement>(null);

  return (
    <Fragment>
      {autofill && (
        <Fragment>
          <PostingAutofill
            onExtract={({ company, position }) => {
              if (companyRef.current) companyRef.current.value = company;
              if (positionRef.current) positionRef.current.value = position;
            }}
          />
          <FieldSeparator className="my-6">or fill in manually</FieldSeparator>
        </Fragment>
      )}
      <form action={formAction}>
        <FieldGroup>
          <Field data-invalid={Boolean(errors.company)}>
            <FieldLabel htmlFor="company">Company</FieldLabel>
            <Input
              ref={companyRef}
              id="company"
              name="company"
              required
              defaultValue={values?.company}
              aria-invalid={Boolean(errors.company)}
            />
            <FieldError>{errors.company?.[0]}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.position)}>
            <FieldLabel htmlFor="position">Position</FieldLabel>
            <Input
              ref={positionRef}
              id="position"
              name="position"
              required
              defaultValue={values?.position}
              aria-invalid={Boolean(errors.position)}
            />
            <FieldError>{errors.position?.[0]}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.url)}>
            <FieldLabel htmlFor="url">Job posting URL</FieldLabel>
            <Input
              id="url"
              name="url"
              type="url"
              defaultValue={values?.url}
              aria-invalid={Boolean(errors.url)}
            />
            <FieldError>{errors.url?.[0]}</FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.status)}>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              name="status"
              value={status}
              onValueChange={(value) => {
                if (value) setStatus(value);
              }}
            >
              <SelectTrigger
                id="status"
                className="w-full"
                aria-invalid={Boolean(errors.status)}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError>{errors.status?.[0]}</FieldError>
          </Field>

          <Field orientation="horizontal">
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner data-icon="inline-start" />}
              {submitLabel}
            </Button>
            <Link href="/" className={buttonVariants({ variant: "ghost" })}>
              Cancel
            </Link>
          </Field>
        </FieldGroup>
      </form>
    </Fragment>
  );
}
