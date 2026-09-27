import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Paginated } from "@/lib/api-types";

interface PaginationNavProps {
  label: string;
  meta: Paginated<unknown>["meta"];
  hrefForPage: (page: number) => string;
}

export function PaginationNav({
  label,
  meta,
  hrefForPage,
}: PaginationNavProps) {
  const { page, totalPages } = meta;

  if (totalPages <= 1 && page === 1) {
    return null;
  }

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6"
    >
      <p className="text-xs text-slate-500">
        Page {page} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={hrefForPage(Math.min(page - 1, Math.max(totalPages, 1)))}
              rel="prev"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft aria-hidden="true" className="size-4" />
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button asChild variant="outline" size="sm">
            <Link href={hrefForPage(page + 1)} rel="next">
              Next
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        )}
      </div>
    </nav>
  );
}
