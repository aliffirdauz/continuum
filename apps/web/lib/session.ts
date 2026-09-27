import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";

import { authOptions } from "./auth";

// Layouts render in parallel with their pages, so every protected page must call this itself.
export const requireSession = cache(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  return session;
});
