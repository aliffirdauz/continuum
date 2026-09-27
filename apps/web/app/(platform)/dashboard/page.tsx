import {
  ArrowRight,
  BookOpenText,
  Boxes,
  FileText,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { CriticalityMeter } from "@/components/criticality-meter";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import type {
  DashboardSummary,
  DepartmentSummary,
  EvidenceItem,
  KnowledgeAreaSummary,
  Paginated,
} from "@/lib/api-types";
import {
  evidenceTypeLabels,
  formatDate,
  formatPercent,
  pluralize,
} from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

const linkClassName =
  "rounded font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none";

interface StatCardProps {
  label: string;
  value: number;
  detail: string;
  icon: LucideIcon;
}

function StatCard({ label, value, detail, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </Card>
  );
}

export default async function DashboardPage() {
  await requireSession();
  const [summary, departments, criticalKnowledge, recentEvidence] =
    await Promise.all([
      apiGet<DashboardSummary>("/dashboard/summary"),
      apiGet<{ data: DepartmentSummary[] }>("/departments"),
      apiGet<Paginated<KnowledgeAreaSummary>>("/knowledge", {
        sort: "criticality",
        pageSize: 6,
      }),
      apiGet<Paginated<EvidenceItem>>("/evidence", { pageSize: 5 }),
    ]);
  const { totals } = summary;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Northstar Industries"
        title="Knowledge overview"
        description="The knowledge Northstar depends on, the business objects it supports, and the evidence that shows where it lives."
      />

      <section
        aria-label="Inventory totals"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          label="Knowledge areas"
          value={totals.knowledgeAreas}
          icon={BookOpenText}
          detail={`${summary.highCriticalityKnowledgeAreas} with business criticality of ${formatPercent(summary.highCriticalityThreshold)} or more`}
        />
        <StatCard
          label="People"
          value={totals.employees}
          icon={UsersRound}
          detail={`Across ${pluralize(totals.departments, "department")}`}
        />
        <StatCard
          label="Business objects"
          value={totals.businessObjects}
          icon={Boxes}
          detail="Processes, systems, assets, and partners that rely on knowledge"
        />
        <StatCard
          label="Evidence records"
          value={totals.evidence}
          icon={FileText}
          detail={
            summary.latestEvidenceAt
              ? `Latest recorded ${formatDate(summary.latestEvidenceAt)}`
              : "No evidence recorded yet"
          }
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Most business-critical knowledge</CardTitle>
              <CardDescription>
                Ordered by the stored business criticality of each knowledge
                area.
              </CardDescription>
            </div>
            <Link
              href="/knowledge"
              className="inline-flex shrink-0 items-center gap-1 rounded text-sm font-semibold text-emerald-800 hover:text-emerald-950 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
            >
              View all
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </CardHeader>
          <Table>
            <TableCaption>
              The six knowledge areas with the highest business criticality
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Knowledge area</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Department
                </TableHead>
                <TableHead scope="col">Criticality</TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right lg:table-cell"
                >
                  People with evidence
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {criticalKnowledge.data.map((area) => (
                <TableRow key={area.id}>
                  <TableCell>
                    <Link
                      href={`/knowledge/${area.id}`}
                      className={linkClassName}
                    >
                      {area.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {area.category}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {area.department.name}
                  </TableCell>
                  <TableCell>
                    <CriticalityMeter value={area.businessCriticality} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {area.contributorCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>
              Where knowledge areas, people, and business objects belong.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {departments.data.map((department) => (
                <li key={department.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/knowledge?department=${department.id}`}
                    className={linkClassName}
                  >
                    {department.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {pluralize(department.knowledgeAreaCount, "knowledge area")}{" "}
                    · {pluralize(department.employeeCount, "person", "people")}{" "}
                    ·{" "}
                    {pluralize(
                      department.businessObjectCount,
                      "business object",
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Recent evidence</CardTitle>
            <CardDescription>
              The latest recorded activity that shows where knowledge lives.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-slate-100">
              {recentEvidence.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <Link
                        href={`/people/${item.employee.id}`}
                        className="rounded hover:text-slate-900 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                      >
                        {item.employee.name}
                      </Link>{" "}
                      ·{" "}
                      <Link
                        href={`/knowledge/${item.knowledgeArea.id}`}
                        className="rounded hover:text-slate-900 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                      >
                        {item.knowledgeArea.name}
                      </Link>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                    <Badge>{evidenceTypeLabels[item.type]}</Badge>
                    <time
                      dateTime={item.occurredAt}
                      className="text-xs text-slate-500 tabular-nums"
                    >
                      {formatDate(item.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-emerald-950 text-white">
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-white/10 text-emerald-200">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle className="text-white">Privacy principle</CardTitle>
            <CardDescription className="text-emerald-50/75">
              Continuum evaluates the resilience of knowledge areas, never
              employee performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-emerald-50/85">
              No rankings, hidden monitoring, private messages, or productivity
              scores. Evidence is shown to explain where knowledge lives.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
