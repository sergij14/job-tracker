"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { extractJobPosting } from "@/lib/ai";
import {
  GLOBAL_DAILY_LIMIT,
  MAX_INPUT_CHARS,
  MIN_INPUT_CHARS,
  USER_DAILY_LIMIT,
} from "@/lib/ai-limits";
import { requireUser } from "@/lib/session";

type ExtractResult =
  | { ok: true; company: string; position: string; remaining: number }
  | { ok: false; error: string };

// Reserve one call if both daily quotas allow it.
async function reserveCall(userId: number) {
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

export async function extractFromPosting(
  input: string,
): Promise<ExtractResult> {
  const user = await requireUser();

  const text = String(input ?? "")
    .trim()
    .slice(0, MAX_INPUT_CHARS);
  if (text.length < MIN_INPUT_CHARS) {
    return { ok: false, error: "Paste the full job posting first." };
  }

  const reservation = await reserveCall(user.id);
  if (!reservation.ok) return reservation;

  try {
    const { data, inputTokens, outputTokens } = await extractJobPosting(text);

    await db
      .update(aiUsage)
      .set({ inputTokens, outputTokens })
      .where(eq(aiUsage.id, reservation.usageId));

    if (!data.isJobPosting) {
      return { ok: false, error: "That doesn't look like a job posting." };
    }

    return {
      ok: true,
      company: data.company.slice(0, 100),
      position: data.position.slice(0, 150),
      remaining: reservation.remaining,
    };
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      error: "The AI request failed. Please fill in the form manually.",
    };
  }
}
