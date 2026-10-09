import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

// Returns the database user for the signed-in person, creating it on first visit.
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const [user] = await db
    .insert(users)
    .values({ email: session.user.email, name: session.user.name })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: session.user.name },
    })
    .returning({ id: users.id, name: users.name });

  return user;
}
