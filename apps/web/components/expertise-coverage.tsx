import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PaginationNav } from "@/components/pagination-nav";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExpertiseContributor, Paginated } from "@/lib/api-types";
import {
  evidenceTypeLabels,
  formatDate,
  formatPercent,
  pluralize,
} from "@/lib/format";
import { UsersRound } from "lucide-react";

export function ExpertiseCoverage({
  contributors,
  effectiveExpertCount,
  total,
  pagination,
}: {
  contributors: ExpertiseContributor[];
  effectiveExpertCount: number;
  total: number;
  pagination?: {
    meta: Paginated<ExpertiseContributor>["meta"];
    hrefForPage: (page: number) => string;
  };
}) {
  return (
    <Card id="expertise" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Expertise coverage</CardTitle>
        <CardDescription>
          Evidence-based coverage within this knowledge area, not a measure of
          employee performance. Scores combine evidence type, strength, recency,
          and variety. Confidence reflects the number, freshness, and variety of
          records.
        </CardDescription>
        <p className="text-sm font-semibold text-emerald-950 tabular-nums">
          {effectiveExpertCount.toFixed(1)} effective experts ·{" "}
          {pluralize(total, "contributor")}
        </p>
        <p className="text-xs text-slate-600">
          Effective experts reflects how evenly expertise is distributed, not a
          headcount. As evidence ages, coverage can change.
        </p>
      </CardHeader>
      <CardContent>
        {contributors.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title={
              total === 0
                ? "No expertise evidence yet"
                : "No contributors on this page"
            }
            description="Recorded evidence will appear here when available."
          />
        ) : (
          <ul className="divide-y divide-slate-200">
            {contributors.map((item) => (
              <li key={item.employee.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start gap-3">
                  <PersonAvatar name={item.employee.name} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/people/${item.employee.id}`}
                      className="rounded font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                    >
                      {item.employee.name}
                    </Link>
                    <p className="text-xs text-slate-600">
                      {item.employee.jobTitle} · {item.employee.department.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-semibold text-slate-950 tabular-nums">
                      {item.expertiseScore.toFixed(1)}{" "}
                      <span className="text-xs font-normal">/ 100</span>
                    </span>
                    <Badge>
                      {item.confidence.charAt(0) +
                        item.confidence.slice(1).toLowerCase()}{" "}
                      confidence
                    </Badge>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  {pluralize(item.evidenceCount, "record")} ·{" "}
                  {item.lastEvidenceAt
                    ? `Latest ${formatDate(item.lastEvidenceAt)}`
                    : "No dated evidence"}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {item.evidenceByType
                    .map(
                      ({ type, count }) =>
                        `${evidenceTypeLabels[type]} (${count})`,
                    )
                    .join(", ")}
                </p>
                {item.evidence.length > 0 ? (
                  <details className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-emerald-900 focus-visible:ring-2 focus-visible:ring-emerald-700">
                      Why this score? See evidence
                    </summary>
                    <ul className="mt-3 space-y-3">
                      {item.evidence.map((record) => (
                        <li
                          key={record.id}
                          className="border-t border-slate-100 pt-3"
                        >
                          <p className="font-medium text-slate-900">
                            {record.title}
                          </p>
                          <p className="text-xs text-slate-600">
                            {evidenceTypeLabels[record.type]} ·{" "}
                            {formatDate(record.occurredAt)} · Strength{" "}
                            {formatPercent(record.strength)} · Type weight{" "}
                            {record.weight.toFixed(2)} · Recency{" "}
                            {record.recencyMultiplier.toFixed(2)} · Contribution{" "}
                            {record.contribution.toFixed(2)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {pagination ? (
        <PaginationNav
          label="Contributor pages"
          meta={pagination.meta}
          hrefForPage={pagination.hrefForPage}
        />
      ) : null}
    </Card>
  );
}
