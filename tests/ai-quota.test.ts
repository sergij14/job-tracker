import { count, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { GLOBAL_DAILY_LIMIT, USER_DAILY_LIMIT } from "@/lib/ai-limits";
import { reserveCall } from "@/lib/ai-quota";
import { createUser, resetDatabase } from "./helpers";

async function usageRows() {
  const [row] = await db.select({ n: count() }).from(aiUsage);
  return row.n;
}

// Fire `n` reservations at once, the way simultaneous requests would arrive.
function reserveConcurrently(userIds: number[]) {
  return Promise.all(userIds.map((userId) => reserveCall(userId)));
}

beforeEach(resetDatabase);
afterAll(() => db.$client.end());

describe("reserveCall", () => {
  it("reserves a slot and reports how many are left", async () => {
    const userId = await createUser();

    const result = await reserveCall(userId);

    expect(result).toMatchObject({ ok: true, remaining: USER_DAILY_LIMIT - 1 });
    expect(await usageRows()).toBe(1);
  });

  it("gives one user exactly their daily limit when requests arrive together", async () => {
    const userId = await createUser();

    const results = await reserveConcurrently(
      Array(USER_DAILY_LIMIT * 3).fill(userId),
    );

    const granted = results.filter((result) => result.ok);
    expect(granted).toHaveLength(USER_DAILY_LIMIT);
    expect(await usageRows()).toBe(USER_DAILY_LIMIT);

    // Each request saw the count left by the one before it, so every slot
    // from the last down to zero was handed out exactly once.
    expect(granted.map((result) => result.remaining).sort((a, b) => a - b)).toEqual(
      Array.from({ length: USER_DAILY_LIMIT }, (_, i) => i),
    );
  });

  it("caps all users together at the global limit when requests arrive together", async () => {
    // More users than the global limit can serve, each asking for their full quota.
    const userCount = GLOBAL_DAILY_LIMIT / USER_DAILY_LIMIT + 2;
    const userIds = await Promise.all(Array.from({ length: userCount }, createUser));

    const results = await reserveConcurrently(
      userIds.flatMap((id) => Array(USER_DAILY_LIMIT).fill(id)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(GLOBAL_DAILY_LIMIT);
    expect(await usageRows()).toBe(GLOBAL_DAILY_LIMIT);
  });

  it("refuses with a message once the user's limit is used", async () => {
    const userId = await createUser();
    for (let i = 0; i < USER_DAILY_LIMIT; i++) await reserveCall(userId);

    const result = await reserveCall(userId);

    expect(result.ok).toBe(false);
    expect(await usageRows()).toBe(USER_DAILY_LIMIT);
  });

  it("doesn't count calls made before today", async () => {
    const userId = await createUser();
    await db.insert(aiUsage).values(
      Array.from({ length: USER_DAILY_LIMIT }, () => ({
        userId,
        feature: "extract-posting",
        createdAt: sql`now() - interval '1 day'`,
      })),
    );

    expect((await reserveCall(userId)).ok).toBe(true);
  });
});
