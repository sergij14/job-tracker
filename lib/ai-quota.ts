import { sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { GLOBAL_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/ai-limits";

// Kept out of the "use server" actions file: every export there becomes an
// endpoint the browser can call, and this must only run after the caller has
// been authenticated.

// Reserve one call if both daily quotas allow it.
export async function reserveCall(userId: number) {
  return db.transaction(async (tx) => {
    // Serialise quota checks so two requests can't both take the last slot.
    await tx.execute(sql`select pg_advisory_xact_lock(1001)`);

    const [counts] = await tx
      .select({
        user: sql<number>`count(*) filter (where ${aiUsage.userId} = ${userId})`.mapWith(
          Number,
        ),
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(aiUsage)
      .where(sql`${aiUsage.createdAt} >= date_trunc('day', now())`);

    if (counts.total >= GLOBAL_DAILY_LIMIT) {
      return {
        ok: false as const,
        error: "The AI feature has reached today's limit. Try again tomorrow.",
      };
    }

    if (counts.user >= USER_DAILY_LIMIT) {
      return {
        ok: false as const,
        error: "You've used all your AI autofills for today.",
      };
    }

    const [row] = await tx
      .insert(aiUsage)
      .values({ userId, feature: "extract-posting" })
      .returning({ id: aiUsage.id });

    return {
      ok: true as const,
      usageId: row.id,
      remaining: USER_DAILY_LIMIT - counts.user - 1,
    };
  });
}
