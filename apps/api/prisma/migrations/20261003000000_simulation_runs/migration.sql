CREATE TABLE "simulation_runs" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "horizon_at" TIMESTAMPTZ(3) NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "formula_version" TEXT NOT NULL,
    "coverage_formula_version" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    CONSTRAINT "simulation_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "simulation_runs_duration_days_check" CHECK ("duration_days" BETWEEN 1 AND 365)
);
CREATE INDEX "simulation_runs_created_by_id_started_at_idx" ON "simulation_runs"("created_by_id", "started_at" DESC);
ALTER TABLE "simulation_runs" ADD CONSTRAINT "simulation_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
