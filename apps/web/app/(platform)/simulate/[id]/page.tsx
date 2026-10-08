import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-summary";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import type {
  BusinessObjectType,
  DepartmentSummary,
  RiskLevel,
} from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import {
  buildHref,
  parseId,
  parsePage,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Simulation result" };
export const dynamic = "force-dynamic";

type ObjectImpact = {
  id: string;
  name: string;
  type: BusinessObjectType;
  criticality: number;
  impactWeight?: number;
  affectedAreaIds?: string[];
};
type Comparison = {
  riskScore: number;
  riskLevel: RiskLevel;
  effectiveExpertCount: number;
  coverage: number;
  weightedContributions?: {
    concentration: number;
    freshness: number;
    documentationGap: number;
  };
};
type AreaImpact = {
  knowledgeArea: {
    id: string;
    name: string;
    department: { id: string; name: string };
  };
  before: Comparison;
  after: Comparison;
  businessObjects: ObjectImpact[];
};
type Simulation = {
  id: string;
  employee: { id: string; name: string };
  startedAt: string;
  horizonAt: string;
  durationDays: number;
  formulaVersion: string;
  coverageFormulaVersion: string;
  summary: {
    affectedAreas: number;
    affectedObjects: number;
    beforeCoverage: number;
    afterCoverage: number;
  };
  areas: AreaImpact[];
  objects: ObjectImpact[];
};
type SimulationResponse = {
  data: Simulation;
  meta?: {
    page: number;
    pageSize: number;
    areasTotal: number;
    objectsTotal: number;
    areasTotalPages: number;
    objectsTotalPages: number;
  };
};

function ComparisonCard({
  label,
  value,
}: {
  label: string;
  value: Comparison;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-4">
      <h4 className="text-sm font-semibold text-slate-700">{label}</h4>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt>Coverage proxy</dt>
          <dd className="font-semibold tabular-nums">
            {value.coverage.toFixed(1)}%
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Risk</dt>
          <dd>
            <RiskBadge level={value.riskLevel} score={value.riskScore} />
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Effective experts</dt>
          <dd className="tabular-nums">
            {value.effectiveExpertCount.toFixed(2)}
          </dd>
        </div>
      </dl>
      {value.weightedContributions ? (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer rounded focus-visible:ring-2 focus-visible:ring-emerald-700">
            Risk factor contributions
          </summary>
          <p className="mt-2">
            Concentration {value.weightedContributions.concentration.toFixed(1)}{" "}
            · Freshness {value.weightedContributions.freshness.toFixed(1)} ·
            Documentation gap{" "}
            {value.weightedContributions.documentationGap.toFixed(1)}
          </p>
        </details>
      ) : null}
    </div>
  );
}

export default async function SimulationResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  if (
    session.user.role !== "MANAGER" &&
    session.user.role !== "KNOWLEDGE_ADMIN"
  ) {
    return (
      <p role="alert" className="text-sm text-slate-700">
        Simulation is available to managers and knowledge admins only.
      </p>
    );
  }
  const { id } = await params;
  const filters = await searchParams;
  const departmentId = parseId(filters.department);
  const page = parsePage(filters.page);
  const [response, departmentsResponse] = await Promise.all([
    apiGet<SimulationResponse>(`/simulations/${encodeURIComponent(id)}`, {
      departmentId,
      page,
      pageSize: 20,
    }),
    apiGet<{ data: DepartmentSummary[] }>("/departments"),
  ]);
  const { data: run, meta } = response;
  // The API applies department filtering before pagination; a linked area can be on another page.
  const areas = run.areas;
  const objects = run.objects;
  const departments = departmentsResponse.data;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Saved what-if analysis"
        title="Unavailability simulation result"
        description={`Hypothetical knowledge-area exposure if ${run.employee.name} were unavailable for ${run.durationDays} days.`}
      />
      <Card className="space-y-3 p-4 sm:p-6">
        <p className="text-sm text-slate-700">
          Captured{" "}
          <time dateTime={run.startedAt}>{formatDate(run.startedAt)}</time> ·
          Simulated horizon{" "}
          <time dateTime={run.horizonAt}>{formatDate(run.horizonAt)}</time>
        </p>
        <p className="text-sm text-slate-700">
          Both scenarios compare the same future horizon. Evidence after capture
          is not forecast; existing documents are not erased. Coverage is an
          absolute knowledge-capacity proxy, not an outage probability. Risk and
          coverage can move in different directions.
        </p>
        <p className="text-xs text-slate-500">
          Risk formula {run.formulaVersion} · Coverage formula{" "}
          {run.coverageFormulaVersion}
        </p>
        <Link
          href="/simulate"
          className="inline-block rounded text-sm font-medium text-emerald-800 underline focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          Start another simulation
        </Link>
      </Card>
      <section
        aria-label="Simulation summary"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          ["Affected knowledge areas", run.summary.affectedAreas],
          ["Connected business objects", run.summary.affectedObjects],
          [
            "Before coverage proxy",
            `${run.summary.beforeCoverage.toFixed(1)}%`,
          ],
          ["After coverage proxy", `${run.summary.afterCoverage.toFixed(1)}%`],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-slate-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </Card>
        ))}
      </section>
      <nav
        aria-label="Filter results by department"
        className="flex flex-wrap items-center gap-2 text-sm"
      >
        <span className="font-medium">Department:</span>
        <Link
          href={`/simulate/${encodeURIComponent(id)}`}
          className="rounded p-2 underline focus-visible:ring-2 focus-visible:ring-emerald-700"
        >
          All
        </Link>
        {departments.map((department) => (
          <Link
            key={department.id}
            href={buildHref(`/simulate/${encodeURIComponent(id)}`, {
              department: department.id,
            })}
            className="rounded p-2 underline focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            {department.name}
          </Link>
        ))}
      </nav>
      <section aria-label="Affected knowledge areas" className="space-y-4">
        <h2 className="text-lg font-semibold">Affected knowledge areas</h2>
        {areas.length === 0 ? (
          <Card className="p-6">
            <p>
              {meta?.areasTotal
                ? "No knowledge areas on this page."
                : `No affected knowledge areas${departmentId ? " in this department" : ""}.`}
            </p>
          </Card>
        ) : (
          areas.map((area) => (
            <Card key={area.knowledgeArea.id} className="space-y-4 p-4 sm:p-6">
              <div>
                <h3 className="font-semibold">
                  <Link
                    href={`/knowledge/${encodeURIComponent(area.knowledgeArea.id)}`}
                    className="rounded underline focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    {area.knowledgeArea.name}
                  </Link>
                </h3>
                <p className="text-sm text-slate-600">
                  {area.knowledgeArea.department.name} ·{" "}
                  <Link
                    href={`/transfers/new?knowledgeArea=${encodeURIComponent(area.knowledgeArea.id)}&primary=${encodeURIComponent(run.employee.id)}`}
                    className="rounded font-medium text-emerald-800 underline focus-visible:ring-2 focus-visible:ring-emerald-700"
                  >
                    Plan a transfer
                  </Link>
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <ComparisonCard
                  label="Before · available"
                  value={area.before}
                />
                <ComparisonCard
                  label="After · unavailable"
                  value={area.after}
                />
              </div>
              {area.businessObjects.length > 0 ? (
                <p className="text-sm text-slate-700">
                  Connected objects:{" "}
                  {area.businessObjects
                    .map(
                      (object) =>
                        `${object.name} (${object.type.toLowerCase()}, criticality ${object.criticality.toFixed(1)}, impact weight ${(object.impactWeight ?? 0).toFixed(1)})`,
                    )
                    .join("; ")}
                </p>
              ) : null}
            </Card>
          ))
        )}
      </section>
      {objects.length > 0 ? (
        <section aria-label="Connected business objects" className="space-y-3">
          <h2 className="text-lg font-semibold">Connected business objects</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {objects.map((object) => (
              <li key={object.id}>
                <Card className="p-4">
                  <p className="font-medium">{object.name}</p>
                  <p className="text-xs text-slate-600">
                    {object.type} · Criticality {object.criticality.toFixed(1)}{" "}
                    · {object.affectedAreaIds?.length ?? 0} affected areas
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {meta && Math.max(meta.areasTotalPages, meta.objectsTotalPages) > 1 ? (
        <nav
          aria-label="Simulation result pages"
          className="flex gap-4 text-sm"
        >
          {page > 1 ? (
            <Link
              className="underline"
              href={buildHref(`/simulate/${encodeURIComponent(id)}`, {
                department: departmentId,
                page: page - 1,
              })}
            >
              Previous
            </Link>
          ) : null}
          <span>
            Page {meta.page} of{" "}
            {Math.max(meta.areasTotalPages, meta.objectsTotalPages)}
          </span>
          {page < Math.max(meta.areasTotalPages, meta.objectsTotalPages) ? (
            <Link
              className="underline"
              href={buildHref(`/simulate/${encodeURIComponent(id)}`, {
                department: departmentId,
                page: page + 1,
              })}
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
