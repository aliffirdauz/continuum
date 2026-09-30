import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { ExpertSearchResults } from "@/components/expert-search-results";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet } from "@/lib/api";
import type { ExpertSearch } from "@/lib/api-types";
import { parseText, type SearchParams } from "@/lib/search-params";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Expert Finder" };
export const dynamic = "force-dynamic";

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const query = parseText((await searchParams).q);
  const results = query
    ? await apiGet<ExpertSearch>("/expert-search", { q: query })
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Coverage discovery"
        title="Expert Finder"
        description="Search knowledge topics to find people with relevant evidence. Results are grouped by area; they are not a cross-area ranking of people."
      />
      <Card className="p-4 sm:p-5">
        <Form
          action="/experts"
          role="search"
          aria-label="Find expertise"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="q">Knowledge topic</Label>
            <Input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Skill, system, or process"
              maxLength={100}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="h-11">
              Search
            </Button>
            {query ? (
              <Button asChild variant="ghost" className="h-11">
                <Link href="/experts">Clear</Link>
              </Button>
            ) : null}
          </div>
        </Form>
      </Card>
      <ExpertSearchResults
        matches={results?.data ?? []}
        total={results?.meta.total ?? 0}
        query={query}
      />
    </div>
  );
}
