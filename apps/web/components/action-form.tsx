"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormState = { error: string; savedAt?: number };

interface ActionFormProps {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm";
  className?: string;
  children?: ReactNode;
}

/**
 * Submits a server action in a transition: a plain form action would reset the
 * fields afterwards, losing what the person entered when the save fails.
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel,
  variant = "default",
  size = "default",
  className,
  children,
}: ActionFormProps) {
  const [state, dispatch, pending] = useActionState(action, { error: "" });
  const form = useRef<HTMLFormElement>(null);
  // Clear entries only after a successful save; keep them when it fails.
  useEffect(() => {
    if (state.savedAt) form.current?.reset();
  }, [state.savedAt]);
  return (
    <form
      ref={form}
      action={dispatch}
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(() => dispatch(form));
      }}
      className={cn("space-y-3", className)}
    >
      {children}
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
        >
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant={variant} size={size} disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
