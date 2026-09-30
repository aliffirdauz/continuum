import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { CriticalityMeter } from "@/components/criticality-meter";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
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
  KnowledgeAreaSummary,
  Paginated,
} from "@/lib/api-types";
import { formatDate, formatPercent, pluralize } from "@/lib/format";
import {
  buildHref,
  parseId,
  parseOption,
  parsePage,
  parseText,
  type SearchParams,
} from "@/lib/search-params";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Knowledge" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const sortOptions = [
  {
    value: "criticality",
    label: "Business criticality",
    summary: "Highest business criticality first",
  },
  { value: "name", label: "Name, A to Z", summary: "Alphabetical by name" },
] as const;
const sortValues = sortOptions.map(({ value }) => value);

interface KnowledgePageProps {
  searchParams: Promise<SearchParams>;
}

export default async function KnowledgePage({
  searchParams,
}: KnowledgePageProps) {
  await requireSession();
  const params = await searchParams;
  const filters = {
    q: parseText(params.q),
    department: parseId(params.department),
    category: parseText(params.category),
    sort: parseOption(params.sort, sortValues) ?? "criticality",
  };
  const page = parsePage(params.page);
  const [areas, departments, categories] = await Promise.all([
    apiGet<Paginated<KnowledgeAreaSummary>>("/knowledge", {
      search: filters.q,
      departmentId: filters.department,
      category: filters.category,
      sort: filters.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    apiGet<{ data: DepartmentSummary[] }>("/departments"),
    apiGet<{ data: string[] }>("/knowledge/categories"),
  ]);
  const hasFilters = [filters.q, filters.department, filters.category].some(
    Boolean,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge explorer"
        title="Knowledge areas"
        description="Browse what Northstar needs to know, the department that owns it, and how much evidence shows where it lives."
      />

      <Card className="p-4 sm:p-5">
        <Form
          action="/knowledge"
          role="search"
          aria-label="Filter knowledge areas"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto] lg:items-end"
        >
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Name or description"
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
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <NativeSelect
              id="category"
              name="category"
              defaultValue={filters.category ?? ""}
            >
              <option value="">All categories</option>
              {categories.data.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sort">Sort by</Label>
            <NativeSelect id="sort" name="sort" defaultValue={filters.sort}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="submit" className="h-11 flex-1 lg:flex-none">
              Apply
            </Button>
            {hasFilters ? (
              <Button asChild variant="ghost" className="h-11">
                <Link href="/knowledge">Clear</Link>
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
            {pluralize(areas.meta.total, "knowledge area")}
          </p>
          <p className="text-xs text-slate-500">
            {sortOptions.find(({ value }) => value === filters.sort)?.summary}
          </p>
        </div>

        {areas.data.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="No knowledge areas match these filters"
            description="Try a different search term, or clear the filters to see every knowledge area."
            action={
              <Button asChild variant="outline">
                <Link href="/knowledge">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <Table>
            <TableCaption>
              Knowledge areas, page {areas.meta.page} of {areas.meta.totalPages}
            </TableCaption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Knowledge area</TableHead>
                <TableHead scope="col" className="hidden md:table-cell">
                  Department
                </TableHead>
                <TableHead scope="col" className="hidden sm:table-cell">
                  Criticality
                </TableHead>
                <TableHead scope="col" className="text-right">
                  Effective experts
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right lg:table-cell"
                >
                  People with evidence
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right lg:table-cell"
                >
                  Evidence
                </TableHead>
                <TableHead
                  scope="col"
                  className="hidden text-right sm:table-cell"
                >
                  Last evidence
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areas.data.map((area) => (
                <TableRow key={area.id}>
                  <TableCell className="min-w-0 sm:min-w-52">
                    <Link
                      href={`/knowledge/${area.id}`}
                      className="rounded font-medium text-slate-900 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                    >
                      {area.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {area.category}
                      <span className="md:hidden">
                        {` · ${area.department.name}`}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-600 sm:hidden">
                      Criticality {formatPercent(area.businessCriticality)}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {area.department.name}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CriticalityMeter value={area.businessCriticality} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {area.effectiveExpertCount.toFixed(1)}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
                    {area.contributorCount}
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums lg:table-cell">
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <PaginationNav
          label="Knowledge area pages"
          meta={areas.meta}
          hrefForPage={(target) =>
            buildHref("/knowledge", { ...filters, page: target })
          }
        />
      </Card>
    </div>
  );
}
