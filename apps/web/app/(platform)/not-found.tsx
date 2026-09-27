import { SearchX } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PlatformNotFound() {
  return (
    <Card className="mx-auto max-w-xl p-6 text-center sm:p-10">
      <span className="mx-auto grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-600">
        <SearchX aria-hidden="true" className="size-5" />
      </span>
      <h1 className="mt-4 text-lg font-semibold text-slate-950">
        We could not find that record
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        It may have been archived, or the link may be incorrect.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link href="/knowledge">Browse knowledge areas</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/people">Browse people</Link>
        </Button>
      </div>
    </Card>
  );
}
