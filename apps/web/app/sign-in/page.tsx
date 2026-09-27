import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Badge } from "@/components/ui/badge";
import { authOptions } from "@/lib/auth";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

const demoAccounts = [
  { email: "employee@northstar.demo", role: "EMPLOYEE" as const },
  { email: "manager@northstar.demo", role: "MANAGER" as const },
  { email: "admin@northstar.demo", role: "KNOWLEDGE_ADMIN" as const },
];

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string | string[];
    reason?: string | string[];
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getServerSession(authOptions);
  const { callbackUrl: requestedCallback, reason } = await searchParams;
  // An expired API token can outlive its session cookie, so show the form instead of looping back.
  const sessionExpired = reason === "expired";

  if (session && !sessionExpired) {
    redirect("/dashboard");
  }

  const callbackUrl =
    requestedCallback === "/dashboard" ? requestedCallback : "/dashboard";
  const showDemoCredentials = process.env.SHOW_DEMO_CREDENTIALS === "true";

  return (
    <main className="min-h-screen bg-[#eef1eb] p-3 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1480px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,0.95fr)]">
        <section className="relative hidden overflow-hidden bg-[#0c2823] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -right-28 -top-24 size-96 rounded-full border border-emerald-200/10" />
          <div className="absolute -right-8 top-12 size-64 rounded-full border border-emerald-200/10" />
          <BrandMark inverse />

          <div className="relative max-w-xl py-20">
            <Badge className="mb-7 border-white/15 bg-white/10 text-emerald-100">
              Northstar Industries
            </Badge>
            <h2 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
              Keep critical knowledge in motion.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-emerald-50/70 xl:text-lg">
              See where operational knowledge lives, understand concentration
              risk, and build resilient backup coverage.
            </p>
          </div>

          <div className="relative grid gap-3 border-t border-white/10 pt-7 text-sm text-emerald-50/75 xl:grid-cols-3">
            {[
              "Evidence-led expertise",
              "Explainable risk",
              "Privacy-aware by design",
            ].map((principle) => (
              <div key={principle} className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 shrink-0 text-emerald-300"
                />
                {principle}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-24">
          <div className="w-full max-w-lg">
            <BrandMark className="mb-12 lg:hidden" />
            <div className="mb-8">
              <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </div>
              <p className="text-sm font-semibold text-emerald-800">
                Secure internal workspace
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                Welcome back
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Sign in with a Northstar demo identity to access the Continuum
                workspace.
              </p>
            </div>

            {sessionExpired ? (
              <p
                role="status"
                className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                Your session has expired. Sign in again to continue.
              </p>
            ) : null}

            <SignInForm
              callbackUrl={callbackUrl}
              demoAccounts={showDemoCredentials ? demoAccounts : []}
            />

            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500">
              <span>Northstar Industries</span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                Knowledge resilience
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
