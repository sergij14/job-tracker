import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { assertTestDatabase } from "./test-database";

// Create the test database if needed and bring it to the latest migration,
// once per run.
export default async function setup(project: TestProject) {
  const url = project.config.env.DATABASE_URL;
  assertTestDatabase(url);
  const name = new URL(url).pathname.slice(1);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    if (!rowCount) await admin.query(`create database "${name}"`);
  } finally {
    await admin.end();
  }

  const db = drizzle(url);
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
  } finally {
    await db.$client.end();
  }
}
