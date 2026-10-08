import { ArrowRightLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { TransferPlanCard } from "@/components/transfer-plan";
import { Button } from "@/components/ui/button";
import { apiGet } from "@/lib/api";
import {
  transferStatuses,
  type Paginated,
  type TransferPlanSummary,
} from "@/lib/api-types";
import {
  buildHref,
  parseOption,
  parsePage,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { transferStatusLabels } from "@/lib/transfer-labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transfers" };
export const dynamic = "force-dynamic";

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const filters = await searchParams;
  const status = parseOption(filters.status, transferStatuses);
  const page = parsePage(filters.page);
  const result = await apiGet<Paginated<TransferPlanSummary>>("/transfers", {
    status,
    page,
    pageSize: 20,
  });
  const canWrite = user.role === "MANAGER" || user.role === "KNOWLEDGE_ADMIN";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge transfer"
        title="Transfer plans"
        description="Deliberate backup coverage for concentrated knowledge. Coverage rises only when completed activities add evidence; it describes the knowledge area, not anyone's performance."
      >
        {canWrite ? (
          <Button asChild>
            <Link href="/transfers/new">New transfer plan</Link>
          </Button>
        ) : null}
      </PageHeader>

      <nav
        aria-label="Filter plans by status"
        className="flex flex-wrap gap-2 text-sm"
      >
        {[undefined, ...transferStatuses].map((option) => (
          <Link
            key={option ?? "all"}
            href={buildHref("/transfers", { status: option })}
            aria-current={option === status ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 font-medium focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none",
              option === status
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
            )}
          >
            {option ? transferStatusLabels[option] : "All"}
          </Link>
        ))}
      </nav>

      {result.data.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title={status ? "No plans with this status" : "No transfer plans yet"}
          description={
            canWrite
              ? "Start from a concentrated knowledge area: choose its primary holder and a backup, then track evidence as the backup learns."
              : "Managers and knowledge admins create transfer plans. Plans will appear here once they exist."
          }
          action={
            canWrite ? (
              <Button asChild>
                <Link href="/transfers/new">New transfer plan</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {result.data.map((plan) => (
            <li key={plan.id}>
              <TransferPlanCard plan={plan} />
            </li>
          ))}
        </ul>
      )}

      <PaginationNav
        label="Transfer plan pages"
        meta={result.meta}
        hrefForPage={(target) =>
          buildHref("/transfers", { status, page: target })
        }
      />
    </div>
  );
}
