import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cache } from "react";

import { authOptions } from "./auth";

export const SIGN_IN_PATH = "/sign-in?callbackUrl=/dashboard";

// Layouts render in parallel with their pages, so every protected page must call this itself.
export const requireSession = cache(async () => {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect(SIGN_IN_PATH);
  }

  return session;
});
