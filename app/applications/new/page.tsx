import Link from "next/link";
import { createApplication } from "@/app/actions";
import { applicationStatus } from "@/db/schema";

export default function NewApplicationPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-6 text-2xl font-semibold">New application</h1>

      <form action={createApplication} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Company
          <input name="company" required className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Position
          <input
            name="position"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Job posting URL
          <input name="url" type="url" className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Status
          <select
            name="status"
            defaultValue="wishlist"
            className="rounded border px-3 py-2"
          >
            {applicationStatus.enumValues.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Save
          </button>
          <Link href="/" className="text-sm text-gray-500">
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
