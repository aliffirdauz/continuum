import type { ReactNode } from "react";

/*
 * Plain-language restatements of the documented, versioned formulas in
 * docs/DEVELOPMENT_PHASES.md. They explain; they never recompute.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="font-semibold text-slate-950">{title}</h3>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
      {rows.map(([term, detail]) => (
        <div key={term} className="flex justify-between gap-4 px-3 py-2">
          <dt>{term}</dt>
          <dd className="text-right font-medium text-slate-950 tabular-nums">
            {detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RiskMethod() {
  return (
    <>
      <Section title="What the risk score measures">
        <p>
          How exposed a <strong>knowledge area</strong> is if its knowledge is
          held by too few people. It is never a score for a person.
        </p>
        <p className="rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-900">
          risk = 100 × criticality × (0.75 × concentration + 0.15 × freshness +
          0.10 × documentation gap)
        </p>
      </Section>
      <Section title="Inputs (formula risk-v1)">
        <Rows
          rows={[
            ["Business criticality", "stored 0–1 per area"],
            ["Concentration", "(3 − effective experts) ÷ 2, 0–1"],
            ["Freshness", "age of the newest evidence"],
            ["Documentation gap", "age of the newest document"],
          ]}
        />
        <p>
          Ages use the same bands for freshness and documentation: up to 90 days
          0, 91–180 days 0.25, 181–365 days 0.5, 366–730 days 0.75, older or
          missing 1.
        </p>
      </Section>
      <Section title="Levels">
        <Rows
          rows={[
            ["Low", "below 10"],
            ["Medium", "10 to below 30"],
            ["High", "30 to below 45"],
            ["Critical", "45 and above"],
          ]}
        />
        <p>
          Levels use the unrounded score. Reaching Low usually needs about three
          comparable holders.
        </p>
      </Section>
    </>
  );
}

export function ExpertiseMethod() {
  return (
    <>
      <Section title="Expertise comes from evidence">
        <p>
          Each evidence record contributes its type weight × strength × a
          recency multiplier. Variety across up to five evidence types adds up
          to 30%. The result is scaled to 0–100 for display.
        </p>
        <Rows
          rows={[
            ["Incident resolved", "1.00"],
            ["Process execution, maintenance", "0.95"],
            ["Project participation, code", "0.85"],
            ["Ticket resolved", "0.80"],
            ["Document authored", "0.75"],
            ["Code review", "0.65"],
            ["Document contribution", "0.60"],
            ["Training completed", "0.50"],
            ["Peer confirmation", "0.45"],
          ]}
        />
        <p>
          Recency bands: 0–90 days count fully, then 0.90, 0.75, 0.55, and 0.35
          beyond two years, softened by each area&apos;s decay rate.
        </p>
      </Section>
      <Section title="Effective experts">
        <p>
          Inverse HHI of the unrounded scores: one holder gives 1, two equal
          holders give 2. It measures how evenly knowledge is spread, not how
          many people have touched it.
        </p>
      </Section>
      <Section title="Confidence">
        <p>
          High needs at least five records, the newest within 180 days, and
          three types. Medium needs two records and either recency within a year
          or two types. It describes evidence quality, not a probability.
        </p>
      </Section>
    </>
  );
}

export function SimulationMethod() {
  return (
    <>
      <Section title="Same horizon, two branches">
        <p>
          Both branches are evaluated at the simulated horizon, using only
          evidence recorded before the run was captured. The unavailable branch
          removes one person&apos;s expertise score; their documents and other
          past evidence still count toward freshness and documentation.
        </p>
      </Section>
      <Section title="Coverage proxy (coverage-v1)">
        <p className="rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-900">
          coverage = 100 × Σ min(100, expertise) ÷ (3 × 100), capped at 100
        </p>
        <p>
          It is an absolute capacity proxy, not a probability of continuity.
        </p>
      </Section>
      <Section title="Why risk and coverage can disagree">
        <p>
          Effective experts is relative. Removing a dominant holder can leave
          the remaining people more evenly matched, so the risk score can stay
          flat or fall slightly while coverage drops sharply. Read both.
        </p>
      </Section>
    </>
  );
}

export function TransferMethod() {
  return (
    <>
      <Section title="Coverage grows only through evidence">
        <p>
          Completing an activity records one evidence row for the backup, with
          the activity weight as strength. Expertise, effective experts, and
          risk then change through the same formulas as everywhere else.
        </p>
        <Rows
          rows={[
            ["Shadow session, training, observation", "Training (0.50)"],
            ["Knowledge interview", "Document contribution (0.60)"],
            ["Documentation", "Document authored (0.75)"],
            ["Review", "Peer confirmation (0.45)"],
            ["Pair work", "Project participation (0.85)"],
            ["Independent validation", "Process execution (0.95)"],
          ]}
        />
        <p>Mapping version transfer-v1.</p>
      </Section>
      <Section title="Recommendations">
        <p>
          Below 40: shadowing, documentation, observation, and interviews.
          40–70: pair work, independent validation, and review. Above 70:
          independent validation, then assigning the backup as a co-owner.
        </p>
      </Section>
      <Section title="Reading progress">
        <p>
          Each checkpoint stores the scores calculated at that moment. One
          backup usually takes a single-holder area from Critical to High; Low
          needs about three comparable holders. If a backup overtakes the
          primary holder, knowledge concentrates on them again and risk can
          rise.
        </p>
      </Section>
    </>
  );
}
