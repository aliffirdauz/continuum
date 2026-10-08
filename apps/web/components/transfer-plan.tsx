import Link from "next/link";

import { RiskBadge } from "@/components/risk-summary";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { TransferPlanSummary, TransferStatus } from "@/lib/api-types";
import { formatDate } from "@/lib/format";
import { transferStatusLabels } from "@/lib/transfer-labels";

const statusVariants: Record<
  TransferStatus,
  "neutral" | "success" | "warning"
> = {
  PLANNED: "neutral",
  IN_PROGRESS: "neutral",
  BLOCKED: "warning",
  COMPLETED: "success",
};

export function TransferStatusBadge({ status }: { status: TransferStatus }) {
  return (
    <Badge variant={statusVariants[status]}>
      {transferStatusLabels[status]}
    </Badge>
  );
}

/** Backup coverage on a 0–100 track, with the baseline and target marked. */
export function CoverageBar({
  coverage,
}: {
  coverage: TransferPlanSummary["coverage"];
}) {
  return (
    <div className="space-y-1.5">
      <p className="flex flex-wrap justify-between gap-x-3 text-sm">
        <span>
          Backup coverage{" "}
          <span className="font-semibold tabular-nums">
            {coverage.baseline.toFixed(1)} → {coverage.current.toFixed(1)}
          </span>{" "}
          of target <span className="tabular-nums">{coverage.target}</span>
        </span>
        <span className="text-slate-600 tabular-nums">
          {coverage.targetMet
            ? "Target reached"
            : `${coverage.progress.toFixed(0)}% of the gap closed`}
        </span>
      </p>
      <div
        aria-hidden="true"
        className="relative h-2.5 rounded-full bg-slate-100"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-700"
          style={{ width: `${Math.min(100, coverage.current)}%` }}
        />
        <div
          className="absolute -inset-y-1 w-0.5 bg-slate-500"
          style={{ left: `${Math.min(100, coverage.baseline)}%` }}
          title="Baseline"
        />
        <div
          className="absolute -inset-y-1.5 w-1 rounded bg-slate-950"
          style={{ left: `calc(${coverage.target}% - 2px)` }}
          title="Target"
        />
      </div>
    </div>
  );
}

export function TransferPlanCard({ plan }: { plan: TransferPlanSummary }) {
  return (
    <Card className="h-full space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">
            <Link
              href={`/transfers/${encodeURIComponent(plan.id)}`}
              className="rounded underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
            >
              {plan.knowledgeArea.name}
            </Link>
          </h2>
          <p className="text-sm text-slate-600">
            {plan.primaryHolder.name} → {plan.backupEmployee.name} ·{" "}
            {plan.knowledgeArea.department.name}
          </p>
        </div>
        <TransferStatusBadge status={plan.status} />
      </div>
      <CoverageBar coverage={plan.coverage} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
        <span className="flex items-center gap-2">
          Area risk now
          <RiskBadge level={plan.risk.riskLevel} score={plan.risk.riskScore} />
        </span>
        <span>
          {plan.activities.completed} of {plan.activities.total} activities
          completed
        </span>
        <span>Target date {formatDate(plan.targetDate)}</span>
      </div>
    </Card>
  );
}
