import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm } from "@/components/action-form";
import { ExplainDrawer } from "@/components/explain-drawer";
import { InfoTip } from "@/components/info-tip";
import { TransferMethod } from "@/components/methodology";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/risk-summary";
import { CoverageBar, TransferStatusBadge } from "@/components/transfer-plan";
import {
  COVERAGE_COLOR,
  RISK_COLOR,
  TrendChart,
  riskBands,
} from "@/components/trend-chart";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { apiGet } from "@/lib/api";
import {
  transferActivityTypes,
  type TransferPlanDetail,
  type TransferStatus,
} from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { glossary } from "@/lib/glossary";
import { isResourceId } from "@/lib/search-params";
import { requireSession } from "@/lib/session";
import {
  activityTypeLabels,
  recommendationBandLabels,
} from "@/lib/transfer-labels";
import {
  addTransferActivity,
  completeTransferActivity,
  updateTransferStatus,
} from "../actions";

export const metadata: Metadata = { title: "Transfer plan" };
export const dynamic = "force-dynamic";

const statusActions: Record<
  TransferStatus,
  Array<{ status: TransferStatus; label: string; pending: string }>
> = {
  PLANNED: [
    { status: "IN_PROGRESS", label: "Start plan", pending: "Starting…" },
    { status: "BLOCKED", label: "Mark blocked", pending: "Saving…" },
  ],
  IN_PROGRESS: [
    { status: "BLOCKED", label: "Mark blocked", pending: "Saving…" },
    { status: "COMPLETED", label: "Complete plan", pending: "Completing…" },
  ],
  BLOCKED: [
    { status: "IN_PROGRESS", label: "Resume plan", pending: "Resuming…" },
  ],
  COMPLETED: [],
};

export default async function TransferPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireSession();
  const { id } = await params;
  if (!isResourceId(id)) notFound();
  const { data: plan } = await apiGet<{ data: TransferPlanDetail }>(
    `/transfers/${encodeURIComponent(id)}`,
  );
  const canWrite = user.role === "MANAGER" || user.role === "KNOWLEDGE_ADMIN";
  const open = plan.status === "PLANNED" || plan.status === "IN_PROGRESS";
  const activityTitle = new Map(plan.activities.map((a) => [a.id, a.title]));
  const checkpointEvent = (activityId: string | null) =>
    activityId
      ? `Completed: ${activityTitle.get(activityId) ?? "activity"}`
      : "Plan created (baseline)";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Transfers", href: "/transfers" },
          { label: plan.knowledgeArea.name },
        ]}
        eyebrow="Knowledge transfer plan"
        title={plan.knowledgeArea.name}
        description={`${plan.primaryHolder.name} (primary holder) → ${plan.backupEmployee.name} (backup) · ${plan.knowledgeArea.department.name}`}
      >
        <ExplainDrawer
          triggerLabel="How progress is measured"
          title="How transfer progress is measured"
        >
          <TransferMethod />
        </ExplainDrawer>
      </PageHeader>

      <section
        aria-labelledby="plan-status"
        className="grid gap-4 lg:grid-cols-3"
      >
        <Card className="space-y-4 p-4 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="plan-status"
              className="flex items-center gap-1 font-semibold"
            >
              Backup coverage
              <InfoTip term="backup coverage">
                {glossary.backupCoverage}
              </InfoTip>
            </h2>
            <TransferStatusBadge status={plan.status} />
          </div>
          <CoverageBar coverage={plan.coverage} />
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-slate-600">Baseline at creation</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {plan.coverage.baseline.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Current</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {plan.coverage.current.toFixed(1)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-600">Target</dt>
              <dd className="text-xl font-semibold tabular-nums">
                {plan.coverage.target}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-600">
            Coverage is {plan.backupEmployee.name}&apos;s evidence-based
            expertise score in this knowledge area. It changes only when
            recorded evidence changes.
          </p>
        </Card>
        <Card className="space-y-3 p-4 sm:p-6">
          <h2 className="font-semibold">Area risk now</h2>
          <RiskBadge level={plan.risk.riskLevel} score={plan.risk.riskScore} />
          <p className="text-sm text-slate-700">
            {plan.risk.effectiveExpertCount.toFixed(2)} effective experts ·{" "}
            <Link
              href={`/knowledge/${encodeURIComponent(plan.knowledgeArea.id)}#risk`}
              className="font-medium underline"
            >
              Risk explanation
            </Link>
          </p>
          <dl className="space-y-1 text-sm text-slate-700">
            <div className="flex justify-between gap-2">
              <dt>Target date</dt>
              <dd>{formatDate(plan.targetDate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Started</dt>
              <dd>{plan.startedAt ? formatDate(plan.startedAt) : "Not yet"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Completed</dt>
              <dd>
                {plan.completedAt ? formatDate(plan.completedAt) : "Not yet"}
              </dd>
            </div>
          </dl>
          {canWrite && statusActions[plan.status].length ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {statusActions[plan.status].map((action) => (
                <ActionForm
                  key={action.status}
                  action={updateTransferStatus.bind(null, plan.id)}
                  submitLabel={action.label}
                  pendingLabel={action.pending}
                  variant={action.status === "BLOCKED" ? "outline" : "default"}
                  size="sm"
                >
                  <input type="hidden" name="status" value={action.status} />
                </ActionForm>
              ))}
            </div>
          ) : null}
        </Card>
      </section>

      <Card className="space-y-3 p-4 sm:p-6">
        <h2 className="font-semibold">Progress history</h2>
        <p className="text-sm text-slate-600">
          Captured when the plan was created and each time an activity was
          completed, as calculated at that moment (risk formula{" "}
          {plan.risk.formulaVersion}, activity mapping {plan.mappingVersion}).
        </p>
        {plan.checkpoints.length > 1 ? (
          <div className="grid gap-6 border-b border-slate-100 pb-5 md:grid-cols-2">
            <TrendChart
              title="Backup coverage"
              summary={`Rose from ${plan.checkpoints[0]!.backupScore.toFixed(1)} at creation to ${plan.checkpoints.at(-1)!.backupScore.toFixed(1)} after ${plan.checkpoints.length - 1} completed activities; target ${plan.coverage.target}.`}
              color={COVERAGE_COLOR}
              reference={{ value: plan.coverage.target, label: "Target" }}
              points={plan.checkpoints.map((checkpoint, index) => ({
                label: index === 0 ? "Start" : `Activity ${index}`,
                value: checkpoint.backupScore,
                detail: `${checkpointEvent(checkpoint.activityId)}: coverage ${checkpoint.backupScore.toFixed(1)}`,
              }))}
            />
            <TrendChart
              title="Area risk score"
              summary={`Moved from ${plan.checkpoints[0]!.riskLevel} ${plan.checkpoints[0]!.riskScore.toFixed(1)} to ${plan.checkpoints.at(-1)!.riskLevel} ${plan.checkpoints.at(-1)!.riskScore.toFixed(1)}. Lower is better.`}
              color={RISK_COLOR}
              bands={riskBands}
              points={plan.checkpoints.map((checkpoint, index) => ({
                label: index === 0 ? "Start" : `Activity ${index}`,
                value: checkpoint.riskScore,
                detail: `${checkpointEvent(checkpoint.activityId)}: ${checkpoint.riskLevel} ${checkpoint.riskScore.toFixed(1)}/100`,
              }))}
            />
          </div>
        ) : null}
        <ol className="divide-y divide-slate-100 sm:hidden">
          {plan.checkpoints.map((checkpoint) => (
            <li key={checkpoint.id} className="space-y-1.5 py-3 text-sm">
              <p className="font-medium">
                {checkpointEvent(checkpoint.activityId)}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
                <span>{formatDate(checkpoint.capturedAt)}</span>
                <span className="tabular-nums">
                  Coverage {checkpoint.backupScore.toFixed(1)}
                </span>
                <span className="tabular-nums">
                  {checkpoint.effectiveExpertCount.toFixed(2)} effective experts
                </span>
                <RiskBadge
                  level={checkpoint.riskLevel}
                  score={checkpoint.riskScore}
                />
              </p>
            </li>
          ))}
        </ol>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="text-xs text-slate-600">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">
                  When
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Event
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Backup coverage
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  Effective experts
                </th>
                <th scope="col" className="py-2 font-medium">
                  Area risk
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.checkpoints.map((checkpoint) => (
                <tr key={checkpoint.id}>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {formatDate(checkpoint.capturedAt)}
                  </td>
                  <td className="py-2 pr-3">
                    {checkpointEvent(checkpoint.activityId)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {checkpoint.backupScore.toFixed(1)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {checkpoint.effectiveExpertCount.toFixed(2)}
                  </td>
                  <td className="py-2">
                    <RiskBadge
                      level={checkpoint.riskLevel}
                      score={checkpoint.riskScore}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {plan.status !== "COMPLETED" ? (
        <Card className="space-y-3 p-4 sm:p-6">
          <h2 className="font-semibold">Recommended next activities</h2>
          <p className="text-sm text-slate-600">
            {recommendationBandLabels[plan.recommendations.band]}. Deterministic
            rules based on the backup&apos;s current coverage.
          </p>
          <ul className="space-y-2">
            {plan.recommendations.recommendations.map((item) => (
              <li
                key={item.label}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm">
                  {item.activityType ? (
                    <span className="font-medium">
                      {activityTypeLabels[item.activityType]}:{" "}
                    </span>
                  ) : null}
                  {item.label}
                </span>
                {item.activityType && canWrite && open ? (
                  <ActionForm
                    action={addTransferActivity.bind(null, plan.id)}
                    submitLabel="Add to plan"
                    pendingLabel="Adding…"
                    variant="outline"
                    size="sm"
                  >
                    <input
                      type="hidden"
                      name="type"
                      value={item.activityType}
                    />
                    <input type="hidden" name="title" value={item.label} />
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section
        id="activities"
        aria-labelledby="activities-heading"
        className="space-y-3"
      >
        <h2 id="activities-heading" className="text-lg font-semibold">
          Activities
        </h2>
        {plan.activities.length === 0 ? (
          <Card className="p-6 text-sm text-slate-700">
            No activities yet.{" "}
            {canWrite && open
              ? "Add a recommended activity or your own below."
              : null}
          </Card>
        ) : (
          <ol className="space-y-3">
            {plan.activities.map((activity) => (
              <li key={activity.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-slate-600">
                      {activityTypeLabels[activity.type]} · weight{" "}
                      {activity.weight.toFixed(2)}
                      {activity.completedAt
                        ? ` · completed ${formatDate(activity.completedAt)}, evidence recorded`
                        : " · planned"}
                    </p>
                  </div>
                  {activity.status === "PLANNED" && canWrite && open ? (
                    <ActionForm
                      action={completeTransferActivity.bind(
                        null,
                        plan.id,
                        activity.id,
                      )}
                      submitLabel="Mark completed"
                      pendingLabel="Recording…"
                      size="sm"
                    />
                  ) : null}
                </Card>
              </li>
            ))}
          </ol>
        )}
        {canWrite && open ? (
          <Card className="p-4 sm:p-6">
            <h3 className="mb-3 font-semibold">Add an activity</h3>
            <ActionForm
              action={addTransferActivity.bind(null, plan.id)}
              submitLabel="Add activity"
              pendingLabel="Adding…"
              className="space-y-4"
            >
              <div className="grid gap-4 md:grid-cols-[1fr_2fr_8rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="activity-type">Type</Label>
                  <NativeSelect
                    id="activity-type"
                    name="type"
                    defaultValue=""
                    required
                  >
                    <option value="" disabled>
                      Choose a type
                    </option>
                    {transferActivityTypes.map((type) => (
                      <option key={type} value={type}>
                        {activityTypeLabels[type]}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="activity-title">Title</Label>
                  <Input
                    id="activity-title"
                    name="title"
                    minLength={3}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="activity-weight">Weight</Label>
                  <Input
                    id="activity-weight"
                    name="weight"
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.05}
                    defaultValue={1}
                    required
                  />
                </div>
              </div>
            </ActionForm>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
