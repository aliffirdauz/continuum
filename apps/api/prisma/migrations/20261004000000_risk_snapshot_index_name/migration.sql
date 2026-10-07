-- Postgres truncated the 64-character name from 20261001000000_risk_snapshots;
-- use the 63-character name Prisma derives so `migrate diff` reports no drift.
ALTER INDEX "knowledge_risk_snapshots_knowledge_area_id_snapshot_date_form_k"
    RENAME TO "knowledge_risk_snapshots_knowledge_area_id_snapshot_date_fo_key";
