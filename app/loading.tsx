export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl p-8" aria-busy="true">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-gray-200" />
      <div className="h-64 animate-pulse rounded bg-gray-100" />
    </main>
  );
}
