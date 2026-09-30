import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { CriticalityMeter } from "@/components/criticality-meter";
import { EmptyState } from "@/components/empty-state";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmployeeExpertise, Paginated } from "@/lib/api-types";
import { formatDate, pluralize } from "@/lib/format";

export function ProfileExpertise({
  items,
  total,
  pagination,
}: {
  items: EmployeeExpertise[];
  total: number;
  pagination?: {
    meta: Paginated<EmployeeExpertise>["meta"];
    hrefForPage: (page: number) => string;
  };
}) {
  return (
    <Card id="expertise" className="scroll-mt-24 overflow-hidden">
      <CardHeader>
        <CardTitle>Expertise by knowledge area</CardTitle>
        <CardDescription>
          Scores describe evidence within each knowledge area, not a comparison
          between people. Confidence reflects evidence count, freshness, and
          variety. Open an area to see linked business objects and the evidence
          behind its coverage.
        </CardDescription>
      </CardHeader>
      {items.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title={
            total === 0
              ? "No expertise evidence yet"
              : "No expertise on this page"
          }
          description="Per-area expertise appears when evidence is recorded."
        />
      ) : (
        <ul className="divide-y divide-slate-100 px-5 pb-5 sm:px-6">
          {items.map(
            ({
              knowledgeArea,
              expertiseScore,
              confidence,
              evidenceCount,
              lastEvidenceAt,
            }) => (
              <li
                key={knowledgeArea.id}
                className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <Link
                    href={`/knowledge/${knowledgeArea.id}`}
                    className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                  >
                    {knowledgeArea.name}
                  </Link>
                  <p className="mt-1 text-xs text-slate-600">
                    {knowledgeArea.department.name} ·{" "}
                    {pluralize(evidenceCount, "record")}
                    {lastEvidenceAt
                      ? ` · Latest ${formatDate(lastEvidenceAt)}`
                      : ""}
                  </p>
                  <div className="mt-2">
                    <CriticalityMeter
                      value={knowledgeArea.businessCriticality}
                    />
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-lg font-semibold text-slate-950 tabular-nums">
                    {expertiseScore.toFixed(1)}{" "}
                    <span className="text-xs font-normal">/ 100</span>
                  </p>
                  <Badge>
                    {confidence.charAt(0) + confidence.slice(1).toLowerCase()}{" "}
                    confidence
                  </Badge>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
      {pagination ? (
        <PaginationNav
          label="Expertise pages"
          meta={pagination.meta}
          hrefForPage={pagination.hrefForPage}
        />
      ) : null}
    </Card>
  );
}
