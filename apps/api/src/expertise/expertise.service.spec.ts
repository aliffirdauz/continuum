import { describe, expect, it, vi } from "vitest";
import { ExpertiseService } from "./expertise.service";
import type { PrismaService } from "../database/prisma.service";

const asOf = new Date("2026-09-01T00:00:00Z");
const department = { id: "dep_m", name: "Manufacturing" };
const area = {
  id: "ka_line",
  name: "Line",
  description: "Troubleshooting",
  businessCriticality: 0.9,
  knowledgeDecayRate: 0.02,
  department,
};
const employee = {
  id: "emp_b",
  name: "Budi",
  jobTitle: "Engineer",
  status: "ACTIVE",
  department,
};
const evidence = {
  id: "ev_real",
  title: "Fixed issue",
  type: "INCIDENT_RESOLVED",
  strength: 1,
  occurredAt: asOf,
  employeeId: employee.id,
  knowledgeAreaId: area.id,
  employee,
};

function service() {
  const prisma = {
    knowledgeArea: {
      findUnique: vi.fn().mockResolvedValue(area),
      findMany: vi.fn().mockResolvedValue([area]),
      count: vi.fn().mockResolvedValue(1),
    },
    employee: { findUnique: vi.fn().mockResolvedValue(employee) },
    evidence: { findMany: vi.fn().mockResolvedValue([evidence]) },
  };
  return {
    api: new ExpertiseService(prisma as unknown as PrismaService),
    prisma,
  };
}

describe("expertise API calculations", () => {
  it("returns paginated contributors with persisted evidence IDs and batched evidence", async () => {
    const { api, prisma } = service();
    const result = await api.forKnowledge(area.id, {
      asOf,
      page: 1,
      pageSize: 1,
    });
    expect(result.data.knowledgeArea.id).toBe(area.id);
    expect(result.data.effectiveExpertCount).toBe(1);
    expect(result.data.contributors[0]).toMatchObject({
      employee,
      evidenceCount: 1,
      evidence: [{ id: "ev_real", title: "Fixed issue", contribution: 1 }],
    });
    expect(result.meta).toMatchObject({
      asOf,
      page: 1,
      pageSize: 1,
      total: 1,
      totalPages: 1,
    });
    expect(prisma.evidence.findMany).toHaveBeenCalledOnce();
    expect(prisma.evidence.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          knowledgeAreaId: { in: [area.id] },
          occurredAt: { lte: asOf },
        },
      }),
    );
  });

  it("returns empty area and person results with no eligible evidence", async () => {
    const { api, prisma } = service();
    prisma.evidence.findMany.mockResolvedValue([]);
    const result = await api.forKnowledge(area.id, {
      asOf,
      page: 1,
      pageSize: 10,
    });
    expect(result.data.contributors).toEqual([]);
    expect(result.data.effectiveExpertCount).toBe(0);
    const person = await api.forEmployee(employee.id, {
      asOf,
      page: 1,
      pageSize: 10,
    });
    expect(person.data).toEqual([]);
    expect(person.meta.total).toBe(0);
  });

  it("searches only five matching areas using one evidence batch", async () => {
    const { api, prisma } = service();
    prisma.knowledgeArea.findMany.mockResolvedValue(
      Array.from({ length: 7 }, (_, i) => ({
        ...area,
        id: `ka_${i}`,
        name: `${i} Line`,
      })),
    );
    const result = await api.search({ q: "line", asOf });
    expect(result.data).toHaveLength(5);
    expect(result.meta).toMatchObject({ query: "line", total: 7, asOf });
    expect(prisma.evidence.findMany).toHaveBeenCalledOnce();
  });

  it("sorts contributors by score while computing concentration before pagination", async () => {
    const { api, prisma } = service();
    const other = { ...employee, id: "emp_a", name: "Andri" };
    prisma.evidence.findMany.mockResolvedValue([
      evidence,
      {
        ...evidence,
        id: "ev_other",
        employeeId: other.id,
        employee: other,
        strength: 0.5,
      },
    ]);
    const result = await api.forKnowledge(area.id, {
      asOf,
      page: 2,
      pageSize: 1,
    });
    expect(result.data.contributors.map(({ employee }) => employee.id)).toEqual(
      ["emp_a"],
    );
    expect(result.data.effectiveExpertCount).toBeGreaterThan(1);
    expect(result.meta.total).toBe(2);
  });

  it("rejects missing records", async () => {
    const { api, prisma } = service();
    prisma.knowledgeArea.findUnique.mockResolvedValue(null);
    prisma.employee.findUnique.mockResolvedValue(null);
    await expect(
      api.forKnowledge("ka_missing", { asOf, page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      api.forEmployee("emp_missing", { asOf, page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
