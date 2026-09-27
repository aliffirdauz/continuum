"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      type="button"
      aria-label="Sign out"
      variant="ghost"
      size="sm"
      onClick={() => void signOut({ callbackUrl: "/sign-in" })}
    >
      <LogOut aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  );
}
