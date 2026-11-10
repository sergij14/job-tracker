"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { extractJobPosting } from "@/lib/ai";
import { MAX_INPUT_CHARS, MIN_INPUT_CHARS } from "@/lib/ai-limits";
import { reserveCall } from "@/lib/ai-quota";
import { requireUser } from "@/lib/session";

type ExtractResult =
  | { ok: true; company: string; position: string; remaining: number }
  | { ok: false; error: string };

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
