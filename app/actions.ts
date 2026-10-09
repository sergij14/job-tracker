"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applicationStatus, applications, companies } from "@/db/schema";

export async function createApplication(formData: FormData) {
  const companyName = String(formData.get("company") ?? "").trim();
  const position = String(formData.get("position") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const rawStatus = String(formData.get("status") ?? "");

  if (!companyName || !position) {
    throw new Error("Company and position are required");
  }

  const status =
    applicationStatus.enumValues.find((value) => value === rawStatus) ??
    "wishlist";

  // Find the company by name, or create it.
  let [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.name, companyName))
    .limit(1);

  if (!company) {
    [company] = await db
      .insert(companies)
      .values({ name: companyName })
      .returning();
  }

  await db.insert(applications).values({
    companyId: company.id,
    position,
    status,
    url: url || null,
    appliedAt:
      status === "wishlist" ? null : new Date().toISOString().slice(0, 10),
  });

  revalidatePath("/");
  redirect("/");
}
