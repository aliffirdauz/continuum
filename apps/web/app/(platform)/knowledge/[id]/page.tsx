import { Boxes, FileText, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CriticalityMeter } from "@/components/criticality-meter";
import { EmptyState } from "@/components/empty-state";
import { EvidenceTable } from "@/components/evidence-table";
import { ExpertiseCoverage } from "@/components/expertise-coverage";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { PersonAvatar } from "@/components/person-avatar";
import { RiskExplanation } from "@/components/risk-summary";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import {
  evidenceTypes,
  type EvidenceItem,
  type KnowledgeAreaDetail,
  type KnowledgeExperts,
  type KnowledgeRisk,
  type Paginated,
  type RiskLevel,
} from "@/lib/api-types";
import {
  businessObjectTypeLabels,
  employeeStatusLabels,
  evidenceTypeLabels,
  formatDate,
  formatPercent,
  pluralize,
} from "@/lib/format";
import {
  buildHref,
  isResourceId,
  parseOption,
  parsePage,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const EVIDENCE_PAGE_SIZE = 10;
type RiskSnapshot = {
  id: string;
  snapshotDate: string;
  asOf: string;
  riskScore: number;
  riskLevel: RiskLevel;
  formulaVersion: string;
};

interface KnowledgeDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

// Shared by generateMetadata and the page so the record is fetched once per request.
const getKnowledgeArea = cache((id: string) =>
  apiGet<KnowledgeAreaDetail>(`/knowledge/${encodeURIComponent(id)}`),
);

export async function generateMetadata({
  params,
}: KnowledgeDetailPageProps): Promise<Metadata> {
  await requireSession();
  const { id } = await params;

  if (!isResourceId(id)) {
    return { title: "Knowledge area" };
  }

  return { title: (await getKnowledgeArea(id)).name };
}

export default async function KnowledgeDetailPage({
  params,
  searchParams,
}: KnowledgeDetailPageProps) {
  await requireSession();
  const { id } = await params;

  if (!isResourceId(id)) {
    notFound();
  }

  const query = await searchParams;
  const type = parseOption(query.type, evidenceTypes);
  const page = parsePage(query.page);
  const expertPage = parsePage(query.expertPage);
  const [area, evidence, experts, risk, snapshots] = await Promise.all([
    getKnowledgeArea(id),
    apiGet<Paginated<EvidenceItem>>(
      `/knowledge/${encodeURIComponent(id)}/evidence`,
      { type, page, pageSize: EVIDENCE_PAGE_SIZE },
    ),
    apiGet<KnowledgeExperts>(`/knowledge/${encodeURIComponent(id)}/experts`, {
      page: expertPage,
      pageSize: 20,
    }),
    apiGet<{ data: KnowledgeRisk }>(
      `/knowledge/${encodeURIComponent(id)}/risk`,
    ),
    apiGet<Paginated<RiskSnapshot>>(
      `/knowledge/${encodeURIComponent(id)}/risk/snapshots`,
      { page: 1, pageSize: 5 },
    ),
  ]);
  const hrefFor = (options: { type?: string; page?: number }) =>
    `${buildHref(`/knowledge/${id}`, options)}#evidence`;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Knowledge", href: "/knowledge" },
          { label: area.name },
        ]}
        title={area.name}
        description={
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{area.category}</Badge>
              <Badge>{area.department.name}</Badge>
              {area.status === "ARCHIVED" ? (
                <Badge variant="warning">Archived</Badge>
              ) : null}
            </div>
            <p>{area.description}</p>
          </>
        }
      />

      <Card>
        <dl className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          <div className="p-5">
            <dt className="text-xs font-medium text-slate-500">
              Business criticality
            </dt>
            <dd className="mt-2">
              <CriticalityMeter value={area.businessCriticality} />
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-xs font-medium text-slate-500">
              People with evidence
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
              {area.contributorCount}
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-xs font-medium text-slate-500">
              Evidence records
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
              {area.evidenceCount}
            </dd>
          </div>
          <div className="p-5">
            <dt className="text-xs font-medium text-slate-500">
              Latest evidence
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-slate-950 tabular-nums">
              {area.lastEvidenceAt ? (
                <time dateTime={area.lastEvidenceAt}>
                  {formatDate(area.lastEvidenceAt)}
                </time>
              ) : (
                "None"
              )}
            </dd>
          </div>
        </dl>
      </Card>

      <RiskExplanation risk={risk.data} />
      {snapshots.data.length > 0 ? (
        <Card id="risk-history" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Captured risk snapshots</CardTitle>
            <CardDescription>
              Observations stored when a knowledge administrator captured them,
              not retrospective recalculations.
              {snapshots.meta.total > snapshots.data.length
                ? ` Showing the latest ${snapshots.data.length} of ${snapshots.meta.total}.`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {snapshots.data.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <span className="text-sm text-slate-700">
                    <time dateTime={snapshot.snapshotDate}>
                      {formatDate(snapshot.snapshotDate)}
                    </time>
                    {` · ${snapshot.formulaVersion}`}
                  </span>
                  <span className="text-sm font-semibold text-slate-950 tabular-nums">
                    {snapshot.riskLevel} · {snapshot.riskScore.toFixed(1)}/100
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <ExpertiseCoverage
        contributors={experts.data.contributors}
        effectiveExpertCount={experts.data.effectiveExpertCount}
        total={experts.meta.total}
        pagination={{
          meta: experts.meta,
          hrefForPage: (target) =>
            `${buildHref(`/knowledge/${id}`, { type, page, expertPage: target })}#expertise`,
        }}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card id="evidence" className="scroll-mt-24 overflow-hidden">
          <CardHeader>
            <CardTitle>Evidence</CardTitle>
            <CardDescription>
              Recorded activity that shows who has worked with this knowledge,
              newest first.
            </CardDescription>
            {area.evidenceByType.length > 0 ? (
              <nav aria-label="Filter evidence by type" className="pt-2">
                <ul className="flex flex-wrap gap-2">
                  {[
                    {
                      label: "All",
                      count: area.evidenceCount,
                      value: undefined,
                    },
                    ...area.evidenceByType.map((entry) => ({
                      label: evidenceTypeLabels[entry.type],
                      count: entry.count,
                      value: entry.type,
                    })),
                  ].map((option) => {
                    const isActive = option.value === type;

                    return (
                      <li key={option.label}>
                        <Link
                          href={hrefFor({ type: option.value })}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none",
                            isActive
                              ? "border-emerald-950 bg-emerald-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          {option.label}
                          <span
                            className={
                              isActive ? "text-emerald-100" : "text-slate-500"
                            }
                          >
                            {option.count}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}
          </CardHeader>
          {evidence.data.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No evidence to show"
              description={
                type
                  ? "No evidence of this type has been recorded for this knowledge area."
                  : "No evidence has been recorded for this knowledge area yet."
              }
            />
          ) : (
            <EvidenceTable
              caption={`Evidence for ${area.name}`}
              evidence={evidence.data}
              context="person"
            />
          )}
          <PaginationNav
            label="Evidence pages"
            meta={evidence.meta}
            hrefForPage={(target) => hrefFor({ type, page: target })}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Connected business objects</CardTitle>
              <CardDescription>
                What depends on this knowledge, by impact weight.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {area.businessObjects.length === 0 ? (
                <EmptyState
                  icon={Boxes}
                  title="No connected business objects"
                  description="This knowledge area is not linked to a process, system, or asset yet."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {area.businessObjects.map((object) => (
                    <li
                      key={object.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {object.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {businessObjectTypeLabels[object.type]} ·{" "}
                          {object.department.name} · Criticality{" "}
                          {formatPercent(object.criticality)}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-xs text-slate-500">
                        Impact
                        <span className="block text-sm font-semibold text-slate-900 tabular-nums">
                          {formatPercent(object.impactWeight)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>People with evidence</CardTitle>
              <CardDescription>
                Listed alphabetically. Continuum shows evidence, not rankings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {area.contributors.length === 0 ? (
                <EmptyState
                  icon={UsersRound}
                  title="No people with evidence"
                  description="Nobody has recorded evidence for this knowledge area yet."
                />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {area.contributors.map((person) => (
                    <li
                      key={person.id}
                      className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <PersonAvatar name={person.name} />
                      <div className="min-w-0">
                        <Link
                          href={`/people/${person.id}`}
                          className="rounded text-sm font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                        >
                          {person.name}
                        </Link>
                        {person.status !== "ACTIVE" ? (
                          <Badge variant="warning" className="ml-2 py-0.5">
                            {employeeStatusLabels[person.status]}
                          </Badge>
                        ) : null}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {person.jobTitle} · {person.department.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          {pluralize(person.evidenceCount, "record")}
                          {person.lastEvidenceAt
                            ? `, latest ${formatDate(person.lastEvidenceAt)}`
                            : null}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {person.evidenceTypes
                            .map(
                              (evidenceType) =>
                                evidenceTypeLabels[evidenceType],
                            )
                            .join(", ")}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
