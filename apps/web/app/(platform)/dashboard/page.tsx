import {
  Activity,
  Check,
  CircleDot,
  Database,
  Layers3,
  Server,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

interface SystemHealth {
  checks: {
    database: "up" | "down";
    redis: "up" | "down";
  };
  status: "ok" | "error";
}

async function getSystemHealth(): Promise<SystemHealth> {
  try {
    const response = await fetch(
      `${process.env.INTERNAL_API_URL ?? "http://localhost:3001/api/v1"}/health/ready`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(2_500),
      },
    );

    if (!response.ok) {
      throw new Error("Readiness endpoint returned a non-success response");
    }

    return (await response.json()) as SystemHealth;
  } catch {
    return {
      status: "error",
      checks: { database: "down", redis: "down" },
    };
  }
}

const phaseOneCapabilities = [
  "Monorepo and build pipeline",
  "PostgreSQL and Prisma migrations",
  "Redis connectivity",
  "Role-aware authentication",
  "Containerized local runtime",
];

const upcomingModules = [
  {
    title: "Knowledge inventory",
    detail: "Map knowledge areas to teams and business objects.",
  },
  {
    title: "Evidence ledger",
    detail: "Trace expertise back to verifiable organizational activity.",
  },
  {
    title: "People directory",
    detail: "Explore knowledge coverage without performance rankings.",
  },
];

export default async function DashboardPage() {
  await requireSession();
  const health = await getSystemHealth();
  const isReady = health.status === "ok";

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="success">Phase 1</Badge>
            <span className="text-xs font-medium text-slate-500">
              Foundation workspace
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950 sm:text-4xl">
            Good foundations make knowledge durable.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Continuum is ready for Northstar&apos;s knowledge model. Phase 2
            will introduce the first organizational data and exploration
            workflows.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span
            className={`size-2.5 rounded-full ${isReady ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {isReady ? "All systems ready" : "System check required"}
            </p>
            <p className="text-[11px] text-slate-500">
              Live infrastructure status
            </p>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="foundation-heading"
        className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]"
      >
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle id="foundation-heading">
                Foundation readiness
              </CardTitle>
              <CardDescription>
                Core services required before knowledge ingestion begins.
              </CardDescription>
            </div>
            <Badge variant={isReady ? "success" : "warning"}>
              {isReady ? "Operational" : "Attention needed"}
            </Badge>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-3 sm:pt-6">
            {[
              {
                label: "API",
                value: isReady ? "Connected" : "Unavailable",
                icon: Server,
                ready: isReady,
              },
              {
                label: "PostgreSQL",
                value: health.checks.database,
                icon: Database,
                ready: health.checks.database === "up",
              },
              {
                label: "Redis",
                value: health.checks.redis,
                icon: Activity,
                ready: health.checks.redis === "up",
              },
            ].map((service) => {
              const Icon = service.icon;

              return (
                <div
                  key={service.label}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon aria-hidden="true" className="size-4" />
                    </span>
                    <span
                      className={`size-2 rounded-full ${service.ready ? "bg-emerald-500" : "bg-amber-500"}`}
                    />
                  </div>
                  <p className="mt-5 text-xs font-medium text-slate-500">
                    {service.label}
                  </p>
                  <p className="mt-1 capitalize text-sm font-semibold text-slate-950">
                    {service.value}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="bg-emerald-950 text-white">
          <CardHeader>
            <div className="mb-3 grid size-10 place-items-center rounded-xl bg-white/10 text-emerald-200">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <CardTitle className="text-white">Privacy principle</CardTitle>
            <CardDescription className="text-emerald-50/65">
              Continuum evaluates the resilience of knowledge areas, never
              employee performance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-emerald-50/80">
              No rankings, hidden monitoring, private messages, or productivity
              scores.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-emerald-50 text-emerald-800">
                <Layers3 aria-hidden="true" className="size-4" />
              </span>
              <div>
                <CardTitle>Phase 1 delivered</CardTitle>
                <CardDescription>
                  Stable infrastructure with a deliberately narrow scope.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {phaseOneCapabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-center gap-3 text-sm text-slate-700"
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-800">
                    <Check
                      aria-hidden="true"
                      className="size-3"
                      strokeWidth={3}
                    />
                  </span>
                  {capability}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-800">
                <CircleDot aria-hidden="true" className="size-4" />
              </span>
              <div>
                <CardTitle>Next: core organizational data</CardTitle>
                <CardDescription>
                  Phase 2 turns the platform foundation into a browsable
                  knowledge map.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingModules.map((module) => (
              <div
                key={module.title}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {module.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {module.detail}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
