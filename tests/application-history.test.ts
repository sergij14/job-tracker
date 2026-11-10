import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  createApplicationRecord,
  updateApplicationRecord,
  updateApplicationStatus,
} from "@/db/mutations";
import { getApplicationHistory } from "@/db/queries";
import { applications } from "@/db/schema";
import type { Status } from "@/lib/statuses";
import { createUser, resetDatabase } from "./helpers";

const INPUT = {
  company: "Acme",
  position: "Frontend Engineer",
  url: "",
  status: "wishlist" as Status,
};

async function createOne(userId: number, status: Status = "wishlist") {
  await createApplicationRecord(userId, { ...INPUT, status });
  const [row] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.userId, userId));
  return row.id;
}

async function transitions(userId: number, applicationId: number) {
  const history = await getApplicationHistory(userId, applicationId);
  return history.map((event) => [event.fromStatus, event.toStatus]);
}

beforeEach(resetDatabase);
afterAll(() => db.$client.end());

describe("application history", () => {
  it("records the starting status when an application is created", async () => {
    const userId = await createUser();
    const id = await createOne(userId, "applied");

    expect(await transitions(userId, id)).toEqual([[null, "applied"]]);
  });

  it("records each status change with the status it came from", async () => {
    const userId = await createUser();
    const id = await createOne(userId);

    await updateApplicationStatus(userId, id, "applied");
    await updateApplicationStatus(userId, id, "interview");
    await updateApplicationRecord(userId, id, { ...INPUT, status: "offer" });

    expect(await transitions(userId, id)).toEqual([
      [null, "wishlist"],
      ["wishlist", "applied"],
      ["applied", "interview"],
      ["interview", "offer"],
    ]);
  });

  it("records nothing when an edit leaves the status unchanged", async () => {
    const userId = await createUser();
    const id = await createOne(userId);

    await updateApplicationStatus(userId, id, "wishlist");
    await updateApplicationRecord(userId, id, {
      ...INPUT,
      position: "Staff Engineer",
    });

    expect(await transitions(userId, id)).toEqual([[null, "wishlist"]]);
  });

  it("doesn't change or record anything for another user's application", async () => {
    const owner = await createUser();
    const intruder = await createUser();
    const id = await createOne(owner);

    await updateApplicationStatus(intruder, id, "offer");

    expect(await transitions(owner, id)).toEqual([[null, "wishlist"]]);
    expect(await transitions(intruder, id)).toEqual([]);
  });

  it("keeps the history a single chain when status changes arrive together", async () => {
    const userId = await createUser();
    const id = await createOne(userId, "applied");

    const targets: Status[] = ["interview", "offer", "rejected", "wishlist"];
    await Promise.all(
      targets.map((status) => updateApplicationStatus(userId, id, status)),
    );

    const history = await getApplicationHistory(userId, id);
    // Every change starts from the status the previous one left...
    for (let i = 1; i < history.length; i++) {
      expect(history[i].fromStatus).toBe(history[i - 1].toStatus);
    }
    // ...and the last one matches the application's current status.
    const [current] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, id));
    expect(history.at(-1)?.toStatus).toBe(current.status);
  });
});
