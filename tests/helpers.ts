import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  companies,
  users,
} from "@/db/schema";
import type { Status } from "@/lib/statuses";
import { assertTestDatabase } from "./test-database";

export async function resetDatabase() {
  assertTestDatabase(process.env.DATABASE_URL);
  // Cascades to applications, application_events and ai_usage.
  await db.execute(sql`truncate users, companies restart identity cascade`);
}

let userCounter = 0;

export async function createUser() {
  const n = ++userCounter;
  const [user] = await db
    .insert(users)
    .values({ email: `user${n}@test.dev`, name: `User ${n}` })
    .returning({ id: users.id });
  return user.id;
}

type EventInput = { from: Status | null; to: Status; at: string };

// Insert an application with a hand-written history, bypassing the mutations,
// for tests that need control over dates.
export async function insertApplication(
  userId: number,
  {
    status,
    appliedAt = null,
    events = [],
  }: { status: Status; appliedAt?: string | null; events?: EventInput[] },
) {
  const [company] = await db
    .insert(companies)
    .values({ name: `Company ${userId}-${Math.random()}` })
    .returning({ id: companies.id });

  const [application] = await db
    .insert(applications)
    .values({
      userId,
      companyId: company.id,
      position: "Engineer",
      status,
      appliedAt,
    })
    .returning({ id: applications.id });

  if (events.length > 0) {
    await db.insert(applicationEvents).values(
      events.map((event) => ({
        applicationId: application.id,
        fromStatus: event.from,
        toStatus: event.to,
        createdAt: new Date(event.at),
      })),
    );
  }

  return application.id;
}
