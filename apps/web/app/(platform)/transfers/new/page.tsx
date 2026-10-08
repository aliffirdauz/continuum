import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";

import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { apiGet } from "@/lib/api";
import type {
  KnowledgeAreaSummary,
  Paginated,
  TransferCandidate,
  TransferCandidates,
} from "@/lib/api-types";
import { utcDateFromToday } from "@/lib/format";
import { parseId, type SearchParams } from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import { createTransfer } from "../actions";

export const metadata: Metadata = { title: "New transfer plan" };
export const dynamic = "force-dynamic";

const describe = ({ employee, expertiseScore }: TransferCandidate) =>
  `${employee.name} · ${employee.jobTitle} · coverage ${expertiseScore.toFixed(1)}`;

export default async function NewTransferPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireSession();
  const header = (
    <PageHeader
      breadcrumbs={[
        { label: "Transfers", href: "/transfers" },
        { label: "New plan" },
      ]}
      title="New transfer plan"
      description="Choose a concentrated knowledge area, the person who holds it, and a backup to build coverage."
    />
  );
  if (user.role !== "MANAGER" && user.role !== "KNOWLEDGE_ADMIN") {
    return (
      <div className="space-y-6">
        {header}
        <p role="alert" className="text-sm text-slate-700">
          Transfer plans are created by managers and knowledge admins.
        </p>
      </div>
    );
  }

  const query = await searchParams;
  const areaId = parseId(query.knowledgeArea);
  const preferredPrimary = parseId(query.primary);
  const [areas, candidates] = await Promise.all([
    apiGet<Paginated<KnowledgeAreaSummary>>("/knowledge", { pageSize: 100 }),
    areaId
      ? apiGet<{ data: TransferCandidates }>(
          `/knowledge/${encodeURIComponent(areaId)}/transfer-candidates`,
        )
      : Promise.resolve(undefined),
  ]);
  const holders = candidates?.data.holders ?? [];
  const primary =
    holders.find(({ employee }) => employee.id === preferredPrimary) ??
    holders[0];

  return (
    <div className="space-y-6">
      {header}
      <Card className="space-y-4 p-4 sm:p-6">
        <h2 className="font-semibold">1. Knowledge area</h2>
        <Form
          action="/transfers/new"
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="knowledgeArea">Knowledge area</Label>
            <NativeSelect
              id="knowledgeArea"
              name="knowledgeArea"
              defaultValue={areaId ?? ""}
              required
            >
              <option value="" disabled>
                Choose a knowledge area
              </option>
              {areas.data.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name} · {area.department.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="outline">
            Show people
          </Button>
        </Form>
      </Card>

      {candidates ? (
        <Card className="space-y-4 p-4 sm:p-6">
          <h2 className="font-semibold">2. People and target</h2>
          <p className="text-sm text-slate-700">
            Coverage is a person&apos;s evidence-based expertise score in{" "}
            <Link
              href={`/knowledge/${encodeURIComponent(candidates.data.knowledgeArea.id)}`}
              className="font-medium underline"
            >
              {candidates.data.knowledgeArea.name}
            </Link>
            , from 0 to 100. Completing activities records evidence for the
            backup.
          </p>
          {primary ? (
            <ActionForm
              action={createTransfer}
              submitLabel="Create transfer plan"
              pendingLabel="Creating plan…"
              className="space-y-5"
            >
              <input
                type="hidden"
                name="knowledgeAreaId"
                value={candidates.data.knowledgeArea.id}
              />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="primaryHolderId">Primary holder</Label>
                  <NativeSelect
                    id="primaryHolderId"
                    name="primaryHolderId"
                    defaultValue={primary.employee.id}
                    required
                  >
                    {holders.map((holder) => (
                      <option
                        key={holder.employee.id}
                        value={holder.employee.id}
                      >
                        {describe(holder)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="backupEmployeeId">Backup</Label>
                  <NativeSelect
                    id="backupEmployeeId"
                    name="backupEmployeeId"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Choose a backup
                    </option>
                    {candidates.data.candidates.map((candidate) => (
                      <option
                        key={candidate.employee.id}
                        value={candidate.employee.id}
                        disabled={candidate.openPlanId !== null}
                      >
                        {describe(candidate)}
                        {candidate.openPlanId
                          ? " · already has an open plan"
                          : ""}
                      </option>
                    ))}
                  </NativeSelect>
                  <p className="text-xs text-slate-600">
                    Active people in{" "}
                    {candidates.data.knowledgeArea.department.name} and anyone
                    with evidence in this area.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="targetCoverage">Target coverage</Label>
                  <Input
                    id="targetCoverage"
                    name="targetCoverage"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    defaultValue={70}
                    required
                  />
                  <p className="text-xs text-slate-600">
                    Whole number from 1 to 100, above the backup&apos;s current
                    coverage.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="targetDate">Target date</Label>
                  <Input
                    id="targetDate"
                    name="targetDate"
                    type="date"
                    min={utcDateFromToday(0)}
                    max={utcDateFromToday(730)}
                    defaultValue={utcDateFromToday(90)}
                    required
                  />
                  <p className="text-xs text-slate-600">
                    UTC date, within two years.
                  </p>
                </div>
              </div>
            </ActionForm>
          ) : (
            <p role="status" className="text-sm text-slate-700">
              Nobody has recorded expertise in this area yet. A transfer plan
              needs a primary holder whose knowledge the backup can learn.
            </p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
