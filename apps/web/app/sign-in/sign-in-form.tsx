"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRole } from "@/lib/roles";
import { roleLabels } from "@/lib/roles";

interface DemoAccount {
  email: string;
  role: UserRole;
}

interface SignInFormProps {
  callbackUrl: string;
  demoAccounts: DemoAccount[];
}

const subscribeToNothing = () => () => {};

// False during server rendering and hydration, true once React handles events.
function useIsHydrated() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
}

export function SignInForm({ callbackUrl, demoAccounts }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[1]?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useIsHydrated();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError(
          "We could not sign you in. Check your credentials and try again.",
        );
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError(
        "The sign-in service is temporarily unavailable. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Before hydration a native submission would bypass Auth.js, so the submit
    // button stays disabled until then and POST keeps credentials out of the URL.
    <form
      method="post"
      className="space-y-5"
      onSubmit={(event) => void handleSubmit(event)}
    >
      {demoAccounts.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Quick demo access
          </legend>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                type="button"
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("");
                  setError(undefined);
                }}
              >
                <span className="block text-xs font-semibold text-slate-800">
                  {roleLabels[account.role]}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                  {account.email}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Select a role, then enter the demo password from the project README.
          </p>
        </fieldset>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@northstar.demo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={12}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-lg text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isHydrated || isSubmitting}
      >
        {isSubmitting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        {isSubmitting ? "Signing in..." : "Enter workspace"}
      </Button>
    </form>
  );
}
