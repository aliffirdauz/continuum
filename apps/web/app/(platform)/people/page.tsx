import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
  DepartmentSummary,
  EmployeeSummary,
  Paginated,
} from "@/lib/api-types";
import { employeeStatusLabels, pluralize } from "@/lib/format";
import {
  buildHref,
  parseId,
  parsePage,
  parseText,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "People" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface PeoplePageProps {
  searchParams: Promise<SearchParams>;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  await requireSession();
  const params = await searchParams;
  const filters = {
    q: parseText(params.q),
    department: parseId(params.department),
  };
  const page = parsePage(params.page);
  const [people, departments] = await Promise.all([
    apiGet<Paginated<EmployeeSummary>>("/employees", {
      search: filters.q,
      departmentId: filters.department,
      page,
      pageSize: PAGE_SIZE,
    }),
    apiGet<{ data: DepartmentSummary[] }>("/departments"),
  ]);
  const hasFilters = [filters.q, filters.department].some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People directory"
        title="People"
        description="Find who has recorded evidence in Northstar's knowledge areas. Continuum shows where knowledge lives, not how people perform."
      />

      <Card className="p-4 sm:p-5">
        <Form
          action="/people"
          role="search"
          aria-label="Filter people"
          className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Name or job title"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="department">Department</Label>
            <NativeSelect
              id="department"
              name="department"
              defaultValue={filters.department ?? ""}
            >
              <option value="">All departments</option>
              {departments.data.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-11 flex-1 sm:flex-none">
              Apply
            </Button>
            {hasFilters ? (
              <Button asChild variant="ghost" className="h-11">
                <Link href="/people">Clear</Link>
              </Button>
            ) : null}
          </div>
        </Form>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <p
            className="text-sm font-semibold text-slate-900"
            aria-live="polite"
          >
            {pluralize(people.meta.total, "person", "people")}
          </p>
          <p className="text-xs text-slate-500">Alphabetical by name</p>
        </div>

        {people.data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No people match these filters"
            description="Try a different name or job title, or clear the filters to see everyone."
            action={
              <Button asChild variant="outline">
                <Link href="/people">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableCaption>
              People, page {people.meta.page} of {people.meta.totalPages}
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Person</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Department
                </TableHead>
                <TableHead scope="col" className="hidden lg:table-cell">
                  Location
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right sm:table-cell"
                >
                  Knowledge areas with evidence
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.data.map((person) => (
                <TableRow key={person.id}>
                  <TableCell className="min-w-56">
                    <div className="flex items-center gap-3">
                      <PersonAvatar name={person.name} />
                      <div className="min-w-0">
                        <Link
                          href={`/people/${person.id}`}
                          className="rounded font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                        >
                          {person.name}
                        </Link>
                        {person.status !== "ACTIVE" ? (
                          <Badge variant="warning" className="ml-2 py-0.5">
                            {employeeStatusLabels[person.status]}
                          </Badge>
                        ) : null}
                        <p className="mt-0.5 text-xs text-slate-500">
                          {person.jobTitle}
                          <span className="md:hidden">
                            {` · ${person.department.name}`}
                          </span>
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {person.department.name}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {person.location}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">
                    {person.knowledgeAreaCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PaginationNav
          label="People pages"
          meta={people.meta}
          hrefForPage={(target) =>
            buildHref("/people", { ...filters, page: target })
          }
        />
      </Card>
    </div>
  );
}
