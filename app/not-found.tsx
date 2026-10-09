import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-md p-8 text-center">
      <h1 className="mb-2 text-2xl font-semibold">Not found</h1>
      <p className="mb-6 text-gray-500">
        {"This application doesn't exist or isn't yours."}
      </p>
      <Link href="/" className="rounded bg-black px-4 py-2 text-sm text-white">
        Back to applications
      </Link>
    </main>
  );
}
