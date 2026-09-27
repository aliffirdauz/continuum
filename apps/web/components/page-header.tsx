import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow?: string;
  breadcrumbs?: Crumb[];
  title: string;
  description?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({
  eyebrow,
  breadcrumbs,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <header className="space-y-4">
      {breadcrumbs ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <ChevronRight aria-hidden="true" className="size-3.5" />
                ) : null}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded font-medium text-slate-600 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-slate-500">
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-2 text-xs font-semibold tracking-[0.16em] text-emerald-800 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-[-0.035em] text-balance text-slate-950 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              {description}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </header>
  );
}
