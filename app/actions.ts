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

async function findOrCreateCompany(name: string) {
  const [existing] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.name, name))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(companies)
    .values({ name })
    .returning({ id: companies.id });
  return created.id;
}

// Set applied_at to today the first time an application leaves the wishlist.
function appliedAtPatch(status: Status) {
  return status === "wishlist"
    ? {}
    : {
        appliedAt: sql<string>`coalesce(${applications.appliedAt}, current_date)`,
      };
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
  const companyId = await findOrCreateCompany(company);

  await db.insert(applications).values({
    userId: user.id,
    companyId,
    position,
    status,
    url: url || null,
    appliedAt: status === "wishlist" ? null : sql`current_date`,
  });

  revalidatePath("/");
  redirect("/");
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
  const companyId = await findOrCreateCompany(company);

  await db
    .update(applications)
    .set({
      companyId,
      position,
      status,
      url: url || null,
      ...appliedAtPatch(status),
    })
    .where(ownedBy(user.id, applicationId));

  revalidatePath("/");
  redirect("/");
}

export async function updateStatus(id: number, status: string) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);
  const nextStatus = statusSchema.parse(status);

  await db
    .update(applications)
    .set({ status: nextStatus, ...appliedAtPatch(nextStatus) })
    .where(ownedBy(user.id, applicationId));

  revalidatePath("/");
}

export async function deleteApplication(id: number) {
  const user = await requireUser();
  const applicationId = idSchema.parse(id);

  await db.delete(applications).where(ownedBy(user.id, applicationId));

  revalidatePath("/");
}
