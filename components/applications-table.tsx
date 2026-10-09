"use client";

import { BriefcaseIcon, MoreHorizontalIcon } from "lucide-react";
import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { toast } from "sonner";
import { deleteApplication, updateStatus } from "@/app/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUSES, type Status } from "@/lib/statuses";

export type ApplicationRow = {
  id: number;
  company: string;
  position: string;
  status: Status;
  appliedAt: string | null;
  pending?: boolean;
};

type OptimisticAction =
  | { type: "status"; id: number; status: Status }
  | { type: "delete"; id: number };

function applyAction(
  rows: ApplicationRow[],
  action: OptimisticAction,
): ApplicationRow[] {
  switch (action.type) {
    case "status":
      return rows.map((row) =>
        row.id === action.id
          ? { ...row, status: action.status, pending: true }
          : row,
      );
    case "delete":
      return rows.filter((row) => row.id !== action.id);
  }
}

export function ApplicationsTable({
  rows,
  emptyMessage,
}: {
  rows: ApplicationRow[];
  emptyMessage: string;
}) {
  const [optimisticRows, addOptimistic] = useOptimistic(rows, applyAction);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  function changeStatus(id: number, status: Status) {
    startTransition(async () => {
      addOptimistic({ type: "status", id, status });
      try {
        await updateStatus(id, status);
      } catch {
        toast.error("Could not update the status. The change was reverted.");
      }
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      addOptimistic({ type: "delete", id });
      try {
        await deleteApplication(id);
      } catch {
        toast.error("Could not delete the application. It was restored.");
      }
    });
  }

  if (optimisticRows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BriefcaseIcon />
          </EmptyMedia>
          <EmptyTitle>{emptyMessage}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {optimisticRows.map((row) => (
            <TableRow
              key={row.id}
              aria-busy={row.pending}
              className={row.pending ? "opacity-60" : undefined}
            >
              <TableCell className="font-medium">{row.company}</TableCell>
              <TableCell>{row.position}</TableCell>
              <TableCell>
                <Select
                  value={row.status}
                  onValueChange={(status) => {
                    if (status) changeStatus(row.id, status);
                  }}
                >
                  <SelectTrigger size="sm" aria-label="Status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.appliedAt ?? "-"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Actions"
                      />
                    }
                  >
                    <MoreHorizontalIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      render={<Link href={`/applications/${row.id}/edit`} />}
                    >
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteId(row.id)}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              {"This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId !== null) remove(deleteId);
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
