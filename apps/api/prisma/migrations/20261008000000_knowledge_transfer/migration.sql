-- CreateEnum
CREATE TYPE "TransferPlanStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TransferActivityType" AS ENUM ('SHADOW_SESSION', 'DOCUMENTATION', 'PAIR_WORK', 'INCIDENT_OBSERVATION', 'TRAINING', 'REVIEW', 'INDEPENDENT_VALIDATION', 'KNOWLEDGE_INTERVIEW');

-- CreateEnum
CREATE TYPE "TransferActivityStatus" AS ENUM ('PLANNED', 'COMPLETED');

-- CreateTable
CREATE TABLE "knowledge_transfer_plans" (
    "id" TEXT NOT NULL,
    "knowledge_area_id" TEXT NOT NULL,
    "primary_holder_id" TEXT NOT NULL,
    "backup_employee_id" TEXT NOT NULL,
    "status" "TransferPlanStatus" NOT NULL DEFAULT 'PLANNED',
    "target_coverage" DOUBLE PRECISION NOT NULL,
    "baseline_coverage" DOUBLE PRECISION NOT NULL,
    "target_date" DATE NOT NULL,
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "knowledge_transfer_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_activities" (
    "id" TEXT NOT NULL,
    "transfer_plan_id" TEXT NOT NULL,
    "type" "TransferActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TransferActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "weight" DOUBLE PRECISION NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "evidence_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transfer_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_checkpoints" (
    "id" TEXT NOT NULL,
    "transfer_plan_id" TEXT NOT NULL,
    "activity_id" TEXT,
    "captured_at" TIMESTAMPTZ(3) NOT NULL,
    "backup_score" DOUBLE PRECISION NOT NULL,
    "primary_holder_score" DOUBLE PRECISION NOT NULL,
    "effective_expert_count" DOUBLE PRECISION NOT NULL,
    "risk_score" DOUBLE PRECISION NOT NULL,
    "risk_level" TEXT NOT NULL,
    "formula_version" TEXT NOT NULL,
    "mapping_version" TEXT NOT NULL,

    CONSTRAINT "transfer_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_transfer_plans_status_created_at_idx" ON "knowledge_transfer_plans"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "knowledge_transfer_plans_knowledge_area_id_backup_employee__idx" ON "knowledge_transfer_plans"("knowledge_area_id", "backup_employee_id");

-- CreateIndex
CREATE INDEX "knowledge_transfer_plans_backup_employee_id_idx" ON "knowledge_transfer_plans"("backup_employee_id");

-- CreateIndex
CREATE INDEX "knowledge_transfer_plans_primary_holder_id_idx" ON "knowledge_transfer_plans"("primary_holder_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_activities_evidence_id_key" ON "transfer_activities"("evidence_id");

-- CreateIndex
CREATE INDEX "transfer_activities_transfer_plan_id_created_at_idx" ON "transfer_activities"("transfer_plan_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_checkpoints_activity_id_key" ON "transfer_checkpoints"("activity_id");

-- CreateIndex
CREATE INDEX "transfer_checkpoints_transfer_plan_id_captured_at_idx" ON "transfer_checkpoints"("transfer_plan_id", "captured_at");

-- AddForeignKey
ALTER TABLE "knowledge_transfer_plans" ADD CONSTRAINT "knowledge_transfer_plans_knowledge_area_id_fkey" FOREIGN KEY ("knowledge_area_id") REFERENCES "knowledge_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_transfer_plans" ADD CONSTRAINT "knowledge_transfer_plans_primary_holder_id_fkey" FOREIGN KEY ("primary_holder_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_transfer_plans" ADD CONSTRAINT "knowledge_transfer_plans_backup_employee_id_fkey" FOREIGN KEY ("backup_employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_transfer_plans" ADD CONSTRAINT "knowledge_transfer_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_activities" ADD CONSTRAINT "transfer_activities_transfer_plan_id_fkey" FOREIGN KEY ("transfer_plan_id") REFERENCES "knowledge_transfer_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_activities" ADD CONSTRAINT "transfer_activities_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_checkpoints" ADD CONSTRAINT "transfer_checkpoints_transfer_plan_id_fkey" FOREIGN KEY ("transfer_plan_id") REFERENCES "knowledge_transfer_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_checkpoints" ADD CONSTRAINT "transfer_checkpoints_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "transfer_activities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Value ranges and integrity rules Prisma cannot express.
ALTER TABLE "knowledge_transfer_plans"
    ADD CONSTRAINT "knowledge_transfer_plans_distinct_people_check" CHECK ("primary_holder_id" <> "backup_employee_id"),
    ADD CONSTRAINT "knowledge_transfer_plans_target_coverage_check" CHECK ("target_coverage" BETWEEN 1 AND 100),
    ADD CONSTRAINT "knowledge_transfer_plans_baseline_coverage_check" CHECK ("baseline_coverage" BETWEEN 0 AND 100);
ALTER TABLE "transfer_activities"
    ADD CONSTRAINT "transfer_activities_weight_check" CHECK ("weight" BETWEEN 0.1 AND 1),
    ADD CONSTRAINT "transfer_activities_completion_check" CHECK (("status" = 'COMPLETED') = ("completed_at" IS NOT NULL AND "evidence_id" IS NOT NULL));
