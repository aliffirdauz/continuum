/** Short definitions for terms people misread; shown in tooltips. */
export const glossary = {
  effectiveExperts:
    "How evenly expertise is spread (inverse HHI of evidence-based scores). One holder gives 1; three equal holders give 3. It is not a headcount.",
  riskScore:
    "Area-level exposure from 0 to 100 (formula risk-v1): business criticality scaled by concentration, evidence freshness, and documentation gap. Higher means more exposed. It never rates a person.",
  businessCriticality:
    "How important this knowledge is to the business, stored per knowledge area from 0% to 100%.",
  coverageProxy:
    "A capacity proxy: the sum of holders' expertise scores (each capped at 100) divided by three experts' worth, from 0% to 100%. Not a probability of continuity.",
  backupCoverage:
    "The backup's evidence-based expertise score in this knowledge area, from 0 to 100. It rises only when completed activities record evidence.",
  confidence:
    "How strong the evidence behind a score is: its count, recency, and variety. It is not a probability.",
} as const;
