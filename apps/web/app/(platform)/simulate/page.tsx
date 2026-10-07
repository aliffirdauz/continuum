import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import type { EmployeeSummary, Paginated } from "@/lib/api-types";
import { requireSession } from "@/lib/session";
import { SimulationForm } from "./simulation-form";

export const metadata: Metadata = { title: "Simulation" };
export const dynamic = "force-dynamic";

export default async function SimulationPage() {
  const session = await requireSession();
  const allowed =
    session.user.role === "MANAGER" || session.user.role === "KNOWLEDGE_ADMIN";
  const employees: EmployeeSummary[] = [];
  if (allowed) {
    let page = 1;
    let totalPages = 1;
    do {
      const result = await apiGet<Paginated<EmployeeSummary>>("/employees", {
        page,
        pageSize: 50,
      });
      employees.push(
        ...result.data.filter((employee) => employee.status === "ACTIVE"),
      );
      totalPages = result.meta.totalPages;
      page += 1;
    } while (page <= totalPages && page <= 20);
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="What-if analysis"
        title="Unavailability simulation"
        description="Compare knowledge-area coverage with and without one active employee at the same future horizon."
      />
      <Card className="space-y-5 p-4 sm:p-6">
        <p className="text-sm text-slate-700">
          A hypothetical knowledge-area exposure model, not an employee
          performance rating or a prediction of business outages. Existing
          documentation remains available. No employee or evidence records are
          changed.
        </p>
        {!allowed ? (
          <p role="alert" className="text-sm text-slate-700">
            Simulation is available to managers and knowledge admins only.
          </p>
        ) : employees.length === 0 ? (
          <p role="status" className="text-sm text-slate-700">
            No active employees available to simulate.
          </p>
        ) : (
          <SimulationForm employees={employees} />
        )}
      </Card>
    </div>
  );
}
