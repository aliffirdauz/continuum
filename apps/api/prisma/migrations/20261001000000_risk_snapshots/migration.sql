CREATE TABLE "knowledge_risk_snapshots" (
    "id" TEXT NOT NULL,
    "knowledge_area_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "as_of" TIMESTAMPTZ(3) NOT NULL,
    "captured_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formula_version" TEXT NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "risk_level" TEXT NOT NULL,
    "business_criticality" DOUBLE PRECISION NOT NULL,
    "effective_expert_count" DOUBLE PRECISION NOT NULL,
    "evidence_count" INTEGER NOT NULL,
    "latest_evidence_age_days" INTEGER,
    "latest_documentation_age_days" INTEGER,
    "factors" JSONB NOT NULL,
    CONSTRAINT "knowledge_risk_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_risk_snapshots_knowledge_area_id_snapshot_date_form_key"
    ON "knowledge_risk_snapshots"("knowledge_area_id", "snapshot_date", "formula_version");
CREATE INDEX "knowledge_risk_snapshots_knowledge_area_id_snapshot_date_idx"
    ON "knowledge_risk_snapshots"("knowledge_area_id", "snapshot_date" DESC);
ALTER TABLE "knowledge_risk_snapshots" ADD CONSTRAINT "knowledge_risk_snapshots_knowledge_area_id_fkey"
    FOREIGN KEY ("knowledge_area_id") REFERENCES "knowledge_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
