import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Integration tests run against a real Postgres, in a database of their own.
// Defaults to the docker-compose server.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5432/job_tracker_test";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    // db/index.ts reads DATABASE_URL when it's first imported.
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // Every file truncates the same database, so files run one at a time.
    fileParallelism: false,
  },
});
