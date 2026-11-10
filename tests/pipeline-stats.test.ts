import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import { getPipelineStats } from "@/db/queries";
import { createUser, insertApplication, resetDatabase } from "./helpers";

beforeEach(resetDatabase);
afterAll(() => db.$client.end());

describe("getPipelineStats", () => {
  it("returns zeros and no median for a user with no applications sent", async () => {
    const userId = await createUser();
    await insertApplication(userId, { status: "wishlist" });

    expect(await getPipelineStats(userId)).toEqual({
      applied: 0,
      interviewed: 0,
      medianDaysToResponse: null,
    });
  });

  it("counts interviews and measures the wait for a first reply", async () => {
    const userId = await createUser();
    const appliedAt = "2026-10-01";

    // Interview after 4 days.
    await insertApplication(userId, {
      status: "interview",
      appliedAt,
      events: [
        { from: null, to: "applied", at: "2026-10-01T09:00:00Z" },
        { from: "applied", to: "interview", at: "2026-10-05T09:00:00Z" },
      ],
    });
    // Rejected after 10 days.
    await insertApplication(userId, {
      status: "rejected",
      appliedAt,
      events: [
        { from: null, to: "applied", at: "2026-10-01T09:00:00Z" },
        { from: "applied", to: "rejected", at: "2026-10-11T09:00:00Z" },
      ],
    });
    // Interview after 2 days, rejected later: still counts as an interview,
    // and the wait is measured to the first reply.
    await insertApplication(userId, {
      status: "rejected",
      appliedAt,
      events: [
        { from: null, to: "applied", at: "2026-10-01T09:00:00Z" },
        { from: "applied", to: "interview", at: "2026-10-03T09:00:00Z" },
        { from: "interview", to: "rejected", at: "2026-10-20T09:00:00Z" },
      ],
    });
    // Still waiting: counts as applied, not in the median.
    await insertApplication(userId, {
      status: "applied",
      appliedAt,
      events: [{ from: null, to: "applied", at: "2026-10-01T09:00:00Z" }],
    });
    // Added straight into "interview": counts as an interview, but there's no
    // measured wait.
    await insertApplication(userId, {
      status: "interview",
      appliedAt,
      events: [{ from: null, to: "interview", at: "2026-10-01T09:00:00Z" }],
    });
    // Created before history was recorded: only its current status is known.
    await insertApplication(userId, { status: "offer", appliedAt });
    // Never sent: not counted at all.
    await insertApplication(userId, { status: "wishlist" });

    expect(await getPipelineStats(userId)).toEqual({
      applied: 6,
      interviewed: 4,
      medianDaysToResponse: 4, // median of 4, 10 and 2 days
    });
  });

  it("only counts the user's own applications", async () => {
    const userId = await createUser();
    const otherId = await createUser();
    await insertApplication(otherId, {
      status: "interview",
      appliedAt: "2026-10-01",
      events: [{ from: "applied", to: "interview", at: "2026-10-02T09:00:00Z" }],
    });

    expect(await getPipelineStats(userId)).toEqual({
      applied: 0,
      interviewed: 0,
      medianDaysToResponse: null,
    });
  });
});
