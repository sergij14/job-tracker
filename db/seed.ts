import { db } from "./index";
import { applications, companies, users } from "./schema";

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

  await db.insert(applications).values([
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
  ]);

  console.log("Seeded 2 companies and 3 applications");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
