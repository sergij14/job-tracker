import { db } from "./index";
import { applicationEvents, applications, companies, users } from "./schema";

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  if (!email) throw new Error("Set SEED_USER_EMAIL in .env");

  const [user] = await db
    .insert(users)
    .values({ email, name: "Seed user" })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning();

  // Deleting companies also deletes their applications (cascade).
  await db.delete(companies);

  const [acme, globex] = await db
    .insert(companies)
    .values([
      { name: "Acme", website: "https://acme.example" },
      { name: "Globex" },
    ])
    .returning();

  const [senior, fullStack, product] = await db
    .insert(applications)
    .values([
    {
      companyId: acme.id,
      position: "Senior Frontend Engineer",
      status: "applied",
      appliedAt: "2026-10-01",
      userId: user.id,
    },
    {
      companyId: acme.id,
      position: "Full-Stack Engineer",
      status: "wishlist",
      userId: user.id,
    },
    {
      companyId: globex.id,
      position: "Product Engineer",
      status: "interview",
      appliedAt: "2026-09-24",
      userId: user.id,
    },
    ])
    .returning({ id: applications.id });

  await db.insert(applicationEvents).values([
    {
      applicationId: senior.id,
      toStatus: "wishlist",
      createdAt: new Date("2026-09-28T10:00:00Z"),
    },
    {
      applicationId: senior.id,
      fromStatus: "wishlist",
      toStatus: "applied",
      createdAt: new Date("2026-10-01T09:30:00Z"),
    },
    {
      applicationId: fullStack.id,
      toStatus: "wishlist",
      createdAt: new Date("2026-10-04T16:00:00Z"),
    },
    {
      applicationId: product.id,
      toStatus: "applied",
      createdAt: new Date("2026-09-24T11:00:00Z"),
    },
    {
      applicationId: product.id,
      fromStatus: "applied",
      toStatus: "interview",
      createdAt: new Date("2026-10-02T14:15:00Z"),
    },
  ]);

  console.log("Seeded 2 companies and 3 applications with history");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
