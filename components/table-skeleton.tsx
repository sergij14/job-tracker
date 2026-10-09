export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-9 animate-pulse rounded bg-gray-100" />
      ))}
    </div>
  );
}
