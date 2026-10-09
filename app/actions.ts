"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { applications, companies } from "@/db/schema";
import { requireUser } from "@/lib/session";
import type { Status } from "@/lib/statuses";
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Insert the company, or return the existing one with the same name.
async function upsertCompany(tx: Tx, name: string) {
  const [company] = await tx
    .insert(companies)
    .values({ name })
    .onConflictDoUpdate({
      target: companies.name,
      set: { name: sql`excluded.name` },
    })
    .returning({ id: companies.id });

  return company.id;
}

// Set applied_at to today the first time an application leaves the wishlist.
function appliedAtPatch(status: Status) {
  return status === "wishlist"
    ? {}
    : {
        appliedAt: sql<string>`coalesce(${applications.appliedAt}, current_date)`,
      };
}

// The home overview and the full list both show applications.
function revalidateApplications() {
  revalidatePath("/");
  revalidatePath("/applications");
}

// Matches one application only if it belongs to this user.
function ownedBy(userId: number, applicationId: number) {
  return and(
    eq(applications.id, applicationId),
    eq(applications.userId, userId),
  );
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

  const { company, position, url, status } = parsed.data;
  await db.transaction(async (tx) => {
    const companyId = await upsertCompany(tx, company);

    await tx.insert(applications).values({
      userId: user.id,
      companyId,
      position,
      status,
      url: url || null,
      appliedAt: status === "wishlist" ? null : sql`current_date`,
    });
  });

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

  const { company, position, url, status } = parsed.data;
  await db.transaction(async (tx) => {
    const companyId = await upsertCompany(tx, company);

    await tx
      .update(applications)
      .set({
        companyId,
        position,
        status,
        url: url || null,
        ...appliedAtPatch(status),
      })
      .where(ownedBy(user.id, applicationId));
  });

  revalidateApplications();
  redirect("/applications");
}

export async function updateStatus(id: number, status: string) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);
  const nextStatus = statusSchema.parse(status);

  await db
    .update(applications)
    .set({ status: nextStatus, ...appliedAtPatch(nextStatus) })
    .where(ownedBy(user.id, applicationId));

  revalidateApplications();
}

export async function deleteApplication(id: number) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);

  await db.delete(applications).where(ownedBy(user.id, applicationId));

  revalidateApplications();
}
