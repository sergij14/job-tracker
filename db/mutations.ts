import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { applicationEvents, applications, companies } from "@/db/schema";
import type { Status } from "@/lib/statuses";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type ApplicationInput = {
  company: string;
  position: string;
  url: string;
  status: Status;
};

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

// Matches one application only if it belongs to this user.
function ownedBy(userId: number, applicationId: number) {
  return and(
    eq(applications.id, applicationId),
    eq(applications.userId, userId),
  );
}

export async function createApplicationRecord(
  userId: number,
  { company, position, url, status }: ApplicationInput,
) {
  await db.transaction(async (tx) => {
    const companyId = await upsertCompany(tx, company);

    const [application] = await tx
      .insert(applications)
      .values({
        userId,
        companyId,
        position,
        status,
        url: url || null,
        appliedAt: status === "wishlist" ? null : sql`current_date`,
      })
      .returning({ id: applications.id });

    await tx
      .insert(applicationEvents)
      .values({ applicationId: application.id, toStatus: status });
  });
}

// Update an application the user owns, and record a status change in its
// history in the same transaction.
//
// The row is locked before its current status is read. Two status changes sent
// at the same time then run one after the other, and the second records the
// status the first one left as its "from" — without the lock both would read
// the same starting status and the history would fork.
async function updateOwned(
  tx: Tx,
  userId: number,
  applicationId: number,
  values: Partial<typeof applications.$inferInsert> & { status: Status },
) {
  const [current] = await tx
    .select({ status: applications.status })
    .from(applications)
    .where(ownedBy(userId, applicationId))
    .for("update");

  // Missing and someone else's look the same: nothing to update.
  if (!current) return;

  await tx
    .update(applications)
    .set({ ...values, ...appliedAtPatch(values.status) })
    .where(ownedBy(userId, applicationId));

  if (current.status !== values.status) {
    await tx.insert(applicationEvents).values({
      applicationId,
      fromStatus: current.status,
      toStatus: values.status,
    });
  }
}

export async function updateApplicationRecord(
  userId: number,
  applicationId: number,
  { company, position, url, status }: ApplicationInput,
) {
  await db.transaction(async (tx) => {
    const companyId = await upsertCompany(tx, company);
    await updateOwned(tx, userId, applicationId, {
      companyId,
      position,
      status,
      url: url || null,
    });
  });
}

export async function updateApplicationStatus(
  userId: number,
  applicationId: number,
  status: Status,
) {
  await db.transaction((tx) =>
    updateOwned(tx, userId, applicationId, { status }),
  );
}

export async function deleteApplicationRecord(
  userId: number,
  applicationId: number,
) {
  await db.delete(applications).where(ownedBy(userId, applicationId));
}
