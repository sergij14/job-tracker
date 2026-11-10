// The suite truncates tables between tests. Refuse to run against a database
// whose name doesn't say it's disposable.
export function assertTestDatabase(
  url: string | undefined,
): asserts url is string {
  const name = url ? new URL(url).pathname.slice(1) : "";
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to run tests against "${name}": the database name must end in "_test".`,
    );
  }
}
