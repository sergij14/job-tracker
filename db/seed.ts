import { db } from "./index";
import { applications, companies } from "./schema";

async function main() {
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
    },
    { companyId: acme.id, position: "Full-Stack Engineer", status: "wishlist" },
    {
      companyId: globex.id,
      position: "Product Engineer",
      status: "interview",
      appliedAt: "2026-09-24",
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
