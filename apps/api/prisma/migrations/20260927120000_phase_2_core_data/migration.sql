-- Trigram operator classes back the case-insensitive search indexes below.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KnowledgeAreaStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BusinessObjectType" AS ENUM ('SERVICE', 'PROCESS', 'PRODUCT', 'PROJECT', 'MACHINE', 'ASSET', 'CUSTOMER', 'SUPPLIER', 'REGULATION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('DOCUMENT_AUTHORED', 'DOCUMENT_CONTRIBUTION', 'PROJECT_PARTICIPATION', 'TICKET_RESOLVED', 'INCIDENT_RESOLVED', 'CODE_CONTRIBUTION', 'CODE_REVIEW', 'TRAINING_COMPLETED', 'PEER_CONFIRMATION', 'PROCESS_EXECUTION', 'MAINTENANCE_ACTIVITY');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_areas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "business_criticality" DOUBLE PRECISION NOT NULL,
    "knowledge_decay_rate" DOUBLE PRECISION NOT NULL,
    "status" "KnowledgeAreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "knowledge_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_objects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BusinessObjectType" NOT NULL,
    "department_id" TEXT NOT NULL,
    "criticality" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "business_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_business_objects" (
    "knowledge_area_id" TEXT NOT NULL,
    "business_object_id" TEXT NOT NULL,
    "impact_weight" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "knowledge_business_objects_pkey" PRIMARY KEY ("knowledge_area_id","business_object_id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "knowledge_area_id" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "source_reference" TEXT,
    "strength" DOUBLE PRECISION NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_status_idx" ON "employees"("status");

-- CreateIndex
CREATE INDEX "employees_name_trgm_idx" ON "employees" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "employees_job_title_trgm_idx" ON "employees" USING GIN ("job_title" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_areas_name_key" ON "knowledge_areas"("name");

-- CreateIndex
CREATE INDEX "knowledge_areas_department_id_idx" ON "knowledge_areas"("department_id");

-- CreateIndex
CREATE INDEX "knowledge_areas_category_idx" ON "knowledge_areas"("category");

-- CreateIndex
CREATE INDEX "knowledge_areas_business_criticality_idx" ON "knowledge_areas"("business_criticality");

-- CreateIndex
CREATE INDEX "knowledge_areas_name_trgm_idx" ON "knowledge_areas" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "knowledge_areas_description_trgm_idx" ON "knowledge_areas" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "business_objects_name_key" ON "business_objects"("name");

-- CreateIndex
CREATE INDEX "business_objects_department_id_idx" ON "business_objects"("department_id");

-- CreateIndex
CREATE INDEX "business_objects_type_idx" ON "business_objects"("type");

-- CreateIndex
CREATE INDEX "business_objects_name_trgm_idx" ON "business_objects" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "knowledge_business_objects_business_object_id_idx" ON "knowledge_business_objects"("business_object_id");

-- CreateIndex
CREATE INDEX "evidence_knowledge_area_id_occurred_at_idx" ON "evidence"("knowledge_area_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "evidence_employee_id_occurred_at_idx" ON "evidence"("employee_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "evidence_type_idx" ON "evidence"("type");

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_areas" ADD CONSTRAINT "knowledge_areas_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_objects" ADD CONSTRAINT "business_objects_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_business_objects" ADD CONSTRAINT "knowledge_business_objects_knowledge_area_id_fkey" FOREIGN KEY ("knowledge_area_id") REFERENCES "knowledge_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_business_objects" ADD CONSTRAINT "knowledge_business_objects_business_object_id_fkey" FOREIGN KEY ("business_object_id") REFERENCES "business_objects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_knowledge_area_id_fkey" FOREIGN KEY ("knowledge_area_id") REFERENCES "knowledge_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Prisma cannot express check constraints, so the 0.0 to 1.0 ranges are enforced here.
ALTER TABLE "knowledge_areas" ADD CONSTRAINT "knowledge_areas_business_criticality_range" CHECK ("business_criticality" >= 0 AND "business_criticality" <= 1);
ALTER TABLE "knowledge_areas" ADD CONSTRAINT "knowledge_areas_knowledge_decay_rate_range" CHECK ("knowledge_decay_rate" >= 0 AND "knowledge_decay_rate" <= 1);
ALTER TABLE "business_objects" ADD CONSTRAINT "business_objects_criticality_range" CHECK ("criticality" >= 0 AND "criticality" <= 1);
ALTER TABLE "knowledge_business_objects" ADD CONSTRAINT "knowledge_business_objects_impact_weight_range" CHECK ("impact_weight" >= 0 AND "impact_weight" <= 1);
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_strength_range" CHECK ("strength" >= 0 AND "strength" <= 1);
