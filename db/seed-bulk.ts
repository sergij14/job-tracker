import { sql } from "drizzle-orm";
import { db } from "./index";
import { users } from "./schema";

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  if (!email) throw new Error("Set SEED_USER_EMAIL in .env");

  const count = Number(process.argv[2] ?? 5000);
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("Count must be a positive integer");
  }

  const [user] = await db
    .insert(users)
    .values({ email, name: "Seed user" })
    .onConflictDoUpdate({ target: users.email, set: { email } })
    .returning({ id: users.id });

  await db.execute(sql`
    insert into companies (name)
    select 'Company ' || n
    from generate_series(1, 200) as n
    on conflict (name) do nothing
  `);

  const started = Date.now();

  await db.execute(sql`
    with company_ids as (
      select array_agg(id) as ids from companies
    )
    insert into applications (user_id, company_id, position, status, applied_at, created_at)
    select
      ${user.id}::int,
      s.company_id,
      s.position,
      s.status,
      case when s.status = 'wishlist' then null else s.created_at::date end,
      s.created_at
    from (
      select
        ids[1 + floor(random() * array_length(ids, 1))::int] as company_id,
        (array[
          'Frontend Engineer', 'Senior Frontend Engineer', 'Full-Stack Engineer',
          'Product Engineer', 'Staff Engineer', 'Web Engineer'
        ])[1 + floor(random() * 6)::int] as position,
        (array['wishlist', 'applied', 'interview', 'offer', 'rejected'])
          [1 + floor(random() * 5)::int]::application_status as status,
        now() - random() * interval '365 days' as created_at
      from generate_series(1, ${count}::int), company_ids
    ) as s
  `);

  console.log(
    `Inserted ${count} applications for ${email} in ${Date.now() - started} ms`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
