import type { Status } from "@/lib/statuses";
import { cn } from "@/lib/utils";

type StatusEvent = {
  id: number;
  fromStatus: Status | null;
  toStatus: Status;
  createdAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function StatusName({ status }: { status: Status }) {
  return <span className="font-medium capitalize">{status}</span>;
}

function waitLabel(from: Date, to: Date) {
  const days = Math.round((to.getTime() - from.getTime()) / DAY_MS);
  if (days === 0) return "same day";
  return `${days} ${days === 1 ? "day" : "days"} later`;
}

export function StatusTimeline({ events }: { events: StatusEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No status changes recorded yet.
      </p>
    );
  }

  return (
    <ol className="space-y-4 border-l pl-5">
      {events.map((event, index) => {
        const previous = events[index - 1];
        const isCurrent = index === events.length - 1;

        return (
          <li key={event.id} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 -left-[calc(1.25rem+4.5px)] size-2 rounded-full ring-4 ring-card",
                isCurrent ? "bg-primary" : "bg-muted-foreground/40",
              )}
            />
            <p className="text-sm">
              {event.fromStatus === null ? (
                <>
                  Added as <StatusName status={event.toStatus} />
                </>
              ) : (
                <>
                  <StatusName status={event.fromStatus} />
                  <span className="text-muted-foreground"> → </span>
                  <StatusName status={event.toStatus} />
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              <time dateTime={event.createdAt.toISOString()}>
                {dateFormat.format(event.createdAt)}
              </time>
              {previous && ` · ${waitLabel(previous.createdAt, event.createdAt)}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
