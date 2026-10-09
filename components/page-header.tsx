import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { UserMenu } from "@/components/auth-buttons";
import { buttonVariants } from "@/components/ui/button";

export function PageHeader({
  title,
  description,
  userName,
}: {
  title: string;
  description?: string;
  userName: string;
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Link href="/applications/new" className={buttonVariants()}>
          <PlusIcon data-icon="inline-start" />
          Add application
        </Link>
        <UserMenu name={userName} />
      </div>
    </div>
  );
}
