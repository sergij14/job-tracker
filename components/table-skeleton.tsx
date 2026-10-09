import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-9" />
      ))}
    </div>
  );
}
