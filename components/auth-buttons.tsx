"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const [isPending, setIsPending] = useState(false);

  async function signIn() {
    setIsPending(true);
    const { error } = await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
    // On success the browser is already leaving for GitHub.
    if (error) setIsPending(false);
  }

  return (
    <Button type="button" size="lg" onClick={signIn} disabled={isPending}>
      {isPending && <Spinner data-icon="inline-start" />}
      Sign in with GitHub
    </Button>
  );
}

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" />}>
        <Avatar size="sm">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {name}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() =>
            authClient.signOut({
              fetchOptions: { onSuccess: () => router.push("/sign-in") },
            })
          }
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
