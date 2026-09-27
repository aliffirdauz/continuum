"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PlatformErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

// Server errors reach the browser as a generic message plus a digest, so no internals are shown here.
export default function PlatformError({ error, retry }: PlatformErrorProps) {
  return (
    <Card role="alert" className="mx-auto max-w-xl p-6 text-center sm:p-10">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-800">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-950">
        We could not load this page
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        The knowledge service did not respond as expected. Try again, or come
        back in a moment.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-slate-500">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={() => retry()}>
          <RotateCw aria-hidden="true" className="size-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to overview</Link>
        </Button>
      </div>
    </Card>
  );
}
