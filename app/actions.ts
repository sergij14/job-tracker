"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createApplicationRecord,
  deleteApplicationRecord,
  updateApplicationRecord,
  updateApplicationStatus,
} from "@/db/mutations";
import { requireUser } from "@/lib/session";
import {
  applicationSchema,
  idSchema,
  statusSchema,
  type FormState,
} from "@/lib/validation";

function readForm(formData: FormData) {
  return {
    company: String(formData.get("company") ?? ""),
    position: String(formData.get("position") ?? ""),
    url: String(formData.get("url") ?? ""),
    status: String(formData.get("status") ?? ""),
  };
}

// The home overview and the full list both show applications.
function revalidateApplications() {
  revalidatePath("/");
  revalidatePath("/applications");
}

export async function createApplication(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = readForm(formData);
  const parsed = applicationSchema.safeParse(values);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  await createApplicationRecord(user.id, parsed.data);

  revalidateApplications();
  redirect("/applications");
}

export async function updateApplication(
  id: number,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);
  const values = readForm(formData);
  const parsed = applicationSchema.safeParse(values);

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }

  await updateApplicationRecord(user.id, applicationId, parsed.data);

  revalidateApplications();
  redirect("/applications");
}

export async function updateStatus(id: number, status: string) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);
  const nextStatus = statusSchema.parse(status);

  await updateApplicationStatus(user.id, applicationId, nextStatus);

  revalidateApplications();
}

export async function deleteApplication(id: number) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);

  await deleteApplicationRecord(user.id, applicationId);

  revalidateApplications();
}
