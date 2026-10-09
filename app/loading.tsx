import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl p-8" aria-busy="true">
      <Skeleton className="mb-6 h-8 w-56" />
      <Skeleton className="h-64" />
    </main>
  );
}
