import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ExpertSearch } from "@/lib/api-types";
import { formatDate, pluralize } from "@/lib/format";

export function ExpertSearchResults({
  matches,
  query,
  total,
}: {
  matches: ExpertSearch["data"];
  query?: string;
  total: number;
}) {
  if (!query || matches.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={SearchX}
          title={
            query
              ? "No matching knowledge areas"
              : "Search for a knowledge area"
          }
          description={
            query
              ? "Try another skill, system, or process name."
              : "Enter a knowledge topic to see its coverage and contributors."
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4" aria-live="polite">
      <p className="text-sm text-slate-600">
        {pluralize(total, "matching knowledge area")} · Showing up to five areas
      </p>
      {matches.map(
        ({ knowledgeArea, effectiveExpertCount, topContributors }) => (
          <Card key={knowledgeArea.id}>
            <CardHeader>
              <CardTitle>
                <Link
                  href={`/knowledge/${knowledgeArea.id}`}
                  className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                >
                  {knowledgeArea.name}
                </Link>
              </CardTitle>
              <CardDescription>
                {knowledgeArea.department.name} · Business criticality{" "}
                {Math.round(knowledgeArea.businessCriticality * 100)}% ·{" "}
                {effectiveExpertCount.toFixed(1)} effective experts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topContributors.length === 0 ? (
                <p className="text-sm text-slate-600">
                  No expertise evidence yet in this area.
                </p>
              ) : (
                <ul
                  className="space-y-3"
                  aria-label={`Contributors for ${knowledgeArea.name}`}
                >
                  {topContributors.map(
                    ({
                      employee,
                      expertiseScore,
                      confidence,
                      evidenceCount,
                      lastEvidenceAt,
                      evidenceByType,
                    }) => (
                      <li
                        key={employee.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm"
                      >
                        <div>
                          <Link
                            href={`/people/${employee.id}`}
                            className="rounded font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                          >
                            {employee.name}
                          </Link>
                          <p className="text-xs text-slate-600">
                            {employee.jobTitle} ·{" "}
                            {pluralize(evidenceCount, "record")} ·{" "}
                            {evidenceByType.length} types
                            {lastEvidenceAt
                              ? ` · Latest ${formatDate(lastEvidenceAt)}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span>{expertiseScore.toFixed(1)} / 100</span>
                          <Badge>
                            {confidence.charAt(0) +
                              confidence.slice(1).toLowerCase()}{" "}
                            confidence
                          </Badge>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              )}
              <Link
                href={`/knowledge/${knowledgeArea.id}#expertise`}
                className="mt-4 inline-block rounded text-sm font-semibold text-emerald-900 underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
              >
                Explore evidence and coverage
              </Link>
            </CardContent>
          </Card>
        ),
      )}
    </div>
  );
}
