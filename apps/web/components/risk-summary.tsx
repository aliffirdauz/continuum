import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  KnowledgeRisk,
  RiskDistribution,
  RiskLevel,
} from "@/lib/api-types";
import { formatDate, formatPercent } from "@/lib/format";

const labels: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};
const colors: Record<RiskLevel, string> = {
  LOW: "border-emerald-200 bg-emerald-50 text-emerald-900",
  MEDIUM: "border-amber-200 bg-amber-50 text-amber-950",
  HIGH: "border-orange-200 bg-orange-50 text-orange-950",
  CRITICAL: "border-rose-200 bg-rose-50 text-rose-950",
};

export function RiskBadge({
  level,
  score,
}: {
  level: RiskLevel;
  score?: number;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${colors[level]}`}
    >
      {labels[level]}
      {score === undefined ? "" : ` · ${score.toFixed(1)}/100`}
    </span>
  );
}

export function RiskOverview({
  distribution,
}: {
  distribution: RiskDistribution;
}) {
  const total = Object.values(distribution.totals).reduce(
    (sum, count) => sum + count,
    0,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Knowledge risk distribution</CardTitle>
        <CardDescription>
          Knowledge areas by risk level as of{" "}
          <time dateTime={distribution.asOf}>
            {formatDate(distribution.asOf)}
          </time>
          . These are area-level resilience indicators, not employee ratings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-slate-600">
            No knowledge areas scored yet.
          </p>
        ) : null}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
            <li key={level} className="rounded-xl border border-slate-200 p-4">
              <RiskBadge level={level} />
              <p className="mt-2 text-2xl font-semibold text-slate-950 tabular-nums">
                {distribution.totals[level]}
              </p>
              <Link
                className="rounded text-sm text-emerald-800 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none"
                href={`/knowledge?risk=${level}`}
              >
                Explore {labels[level].toLowerCase()} risk
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function RiskExplanation({ risk }: { risk: KnowledgeRisk }) {
  const factors = [
    {
      label: "Business criticality",
      value: risk.factors.businessCriticality,
      detail: "How important this knowledge is to the business.",
    },
    {
      label: "Concentration",
      value: risk.factors.concentration,
      detail: "How concentrated the effective expertise is.",
    },
    {
      label: "Evidence freshness",
      value: risk.factors.freshness,
      detail:
        risk.latestEvidenceAgeDays === null
          ? "No evidence recorded"
          : `Latest evidence ${risk.latestEvidenceAgeDays} days old`,
    },
    {
      label: "Documentation gap",
      value: risk.factors.documentationGap,
      detail:
        risk.latestDocumentationAgeDays === null
          ? "No documentation recorded"
          : `Latest documentation ${risk.latestDocumentationAgeDays} days old`,
    },
  ];
  return (
    <Card id="risk" className="scroll-mt-24">
      <CardHeader>
        <CardTitle>Knowledge resilience risk</CardTitle>
        <CardDescription>
          Area-level risk as of{" "}
          <time dateTime={risk.asOf}>{formatDate(risk.asOf)}</time> · Formula{" "}
          {risk.formulaVersion}. Higher inputs indicate greater exposure, not a
          score for any person.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <RiskBadge level={risk.riskLevel} score={risk.riskScore} />
          <span className="text-sm text-slate-600">
            {risk.effectiveExpertCount.toFixed(1)} effective experts ·{" "}
            {risk.evidenceCount} evidence records
          </span>
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          {factors.map((factor) => (
            <div
              key={factor.label}
              className="rounded-lg border border-slate-200 p-3"
            >
              <dt className="text-sm font-semibold text-slate-900">
                {factor.label}
              </dt>
              <dd className="mt-1 text-lg font-medium text-slate-950 tabular-nums">
                {formatPercent(factor.value)}
              </dd>
              <dd className="text-xs text-slate-600">{factor.detail}</dd>
            </div>
          ))}
        </dl>
        {risk.formulaVersion === "risk-v1" ? (
          <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Risk points (risk-v1)
            </p>
            <p>
              Business criticality scales the sum of 75% concentration, 15%
              freshness, and 10% documentation gap.
            </p>
            <ul className="mt-2 grid gap-1 tabular-nums sm:grid-cols-3">
              <li>
                Concentration:{" "}
                {risk.weightedContributions.concentration.toFixed(1)} points
              </li>
              <li>
                Freshness: {risk.weightedContributions.freshness.toFixed(1)}{" "}
                points
              </li>
              <li>
                Documentation gap:{" "}
                {risk.weightedContributions.documentationGap.toFixed(1)} points
              </li>
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
