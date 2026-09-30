import { BookOpenText, FileText, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CriticalityMeter } from "@/components/criticality-meter";
import { EmptyState } from "@/components/empty-state";
import { EvidenceTable } from "@/components/evidence-table";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { PersonAvatar } from "@/components/person-avatar";
import { ProfileExpertise } from "@/components/profile-expertise";
import { Badge } from "@/components/ui/badge";
import {
  Card,
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
  EmployeeDetail,
  EmployeeExpertise,
  EvidenceItem,
  Paginated,
} from "@/lib/api-types";
import {
  employeeStatusLabels,
  evidenceTypeLabels,
  formatDate,
  formatMonth,
} from "@/lib/format";
import {
  buildHref,
  isResourceId,
  parsePage,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const EVIDENCE_PAGE_SIZE = 10;

interface PersonPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}

// Shared by generateMetadata and the page so the record is fetched once per request.
const getPerson = cache((id: string) =>
  apiGet<EmployeeDetail>(`/employees/${encodeURIComponent(id)}`),
);

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  await requireSession();
  const { id } = await params;

  if (!isResourceId(id)) {
    return { title: "Person" };
  }

  return { title: (await getPerson(id)).name };
}

export default async function PersonPage({
  params,
  searchParams,
}: PersonPageProps) {
  await requireSession();
  const { id } = await params;

  if (!isResourceId(id)) {
    notFound();
  }

  const query = await searchParams;
  const page = parsePage(query.page);
  const expertisePage = parsePage(query.expertisePage);
  const [person, evidence, expertise] = await Promise.all([
    getPerson(id),
    apiGet<Paginated<EvidenceItem>>(
      `/employees/${encodeURIComponent(id)}/evidence`,
      { page, pageSize: EVIDENCE_PAGE_SIZE },
    ),
    apiGet<Paginated<EmployeeExpertise>>(
      `/employees/${encodeURIComponent(id)}/expertise`,
      {
        page: expertisePage,
        pageSize: 20,
      },
    ),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "People", href: "/people" },
          { label: person.name },
        ]}
        title={person.name}
        description={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <PersonAvatar name={person.name} size="lg" />
            <div>
              <p className="font-medium text-slate-800">{person.jobTitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge>{person.department.name}</Badge>
                <Badge className="gap-1">
                  <MapPin aria-hidden="true" className="size-3" />
                  {person.location}
                </Badge>
                <Badge>Joined {formatMonth(person.joinedAt)}</Badge>
                {person.status !== "ACTIVE" ? (
                  <Badge variant="warning">
                    {employeeStatusLabels[person.status]}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        }
      />

      <ProfileExpertise
        items={expertise.data}
        total={expertise.meta.total}
        pagination={{
          meta: expertise.meta,
          hrefForPage: (target) =>
            `${buildHref(`/people/${id}`, { page, expertisePage: target })}#expertise`,
        }}
      />

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Knowledge areas with evidence</CardTitle>
          <CardDescription>
            Where {person.name} has recorded evidence, listed alphabetically.
            See expertise above for evidence-based coverage in each area.
          </CardDescription>
        </CardHeader>
        {person.knowledgeAreas.length === 0 ? (
          <EmptyState
            icon={BookOpenText}
            title="No knowledge areas yet"
            description={`No evidence has been recorded for ${person.name} yet.`}
          />
        ) : (
          <Table>
            <TableCaption>Knowledge areas with evidence</TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Knowledge area</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Criticality
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Evidence
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right sm:table-cell"
                >
                  Latest
                </TableHead>
                <TableHead scope="col" className="hidden lg:table-cell">
                  Evidence types
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {person.knowledgeAreas.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="min-w-52">
                    <Link
                      href={`/knowledge/${area.id}`}
                      className="rounded font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                    >
                      {area.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {area.category} · {area.department.name}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <CriticalityMeter value={area.businessCriticality} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {area.evidenceCount}
                  </TableCell>
                  <TableCell className="hidden text-right whitespace-nowrap tabular-nums sm:table-cell">
                    {area.lastEvidenceAt ? (
                      <time dateTime={area.lastEvidenceAt}>
                        {formatDate(area.lastEvidenceAt)}
                      </time>
                    ) : (
                      "None"
                    )}
                  </TableCell>
                  <TableCell className="hidden text-xs text-slate-500 lg:table-cell">
                    {area.evidenceTypes
                      .map((evidenceType) => evidenceTypeLabels[evidenceType])
                      .join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Card id="evidence" className="scroll-mt-24 overflow-hidden">
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>
            Recorded activity across every knowledge area, newest first.
          </CardDescription>
        </CardHeader>
        {evidence.data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No evidence recorded"
            description="Evidence appears here when it is recorded for this person."
          />
        ) : (
          <EvidenceTable
            caption={`Evidence recorded for ${person.name}`}
            evidence={evidence.data}
            context="knowledgeArea"
          />
        )}
        <PaginationNav
          label="Evidence pages"
          meta={evidence.meta}
          hrefForPage={(target) =>
            `${buildHref(`/people/${id}`, { page: target })}#evidence`
          }
        />
      </Card>
    </div>
  );
}
