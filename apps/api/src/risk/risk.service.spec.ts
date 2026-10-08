import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { RiskService } from "./risk.service";
import type { PrismaService } from "../database/prisma.service";

const asOf = new Date("2026-09-01T00:00:00Z");
const areas = [
  {
    id: "ka_a",
    name: "A",
    businessCriticality: 1,
    knowledgeDecayRate: 1,
    department: { id: "dep_a", name: "A" },
  },
  {
    id: "ka_b",
    name: "B",
    businessCriticality: 0.5,
    knowledgeDecayRate: 1,
    department: { id: "dep_b", name: "B" },
  },
];
function fixture() {
  const prisma = {
    knowledgeArea: {
      findMany: vi.fn().mockResolvedValue(areas),
      findUnique: vi.fn().mockResolvedValue(areas[0]),
    },
    evidence: { findMany: vi.fn().mockResolvedValue([]) },
    employee: { findMany: vi.fn().mockResolvedValue([]) },
    knowledgeRiskSnapshot: {
      upsert: vi
        .fn()
        .mockImplementation(({ create }) => Promise.resolve(create)),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma,
    service: new RiskService(prisma as unknown as PrismaService),
  };
}
describe("risk service", () => {
  it("calculates area and dashboard risk from batched evidence without persisting on reads", async () => {
    const { prisma, service } = fixture();
    const area = await service.forKnowledge("ka_a", { asOf });
    expect(area.data).toMatchObject({
      knowledgeArea: { id: "ka_a" },
      effectiveExpertCount: 0,
      riskScore: 100,
      riskLevel: "CRITICAL",
      evidenceCount: 0,
    });
    const distribution = await service.distribution({ asOf });
    expect(distribution).toEqual({
      asOf,
      totals: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 2 },
    });
    expect(prisma.evidence.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.knowledgeRiskSnapshot.upsert).not.toHaveBeenCalled();
  });
  it("uses unrounded expertise and sorts descending risk with stable id tie-breaks and pagination", async () => {
    const { service, prisma } = fixture();
    prisma.knowledgeArea.findMany.mockResolvedValue([areas[1], areas[0]]);
    const result = await service.highRisk({ asOf, page: 2, pageSize: 1 });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(result.data[0]?.knowledgeArea.id).toBe("ka_b");
    const departments = await service.departments({ asOf });
    expect(departments.data.map((entry) => entry.department.id)).toEqual([
      "dep_a",
      "dep_b",
    ]);
  });
  it("summarizes overall exposure and bounds department results", async () => {
    const { service } = fixture();
    expect(await service.overview({ asOf })).toEqual({
      asOf,
      totalKnowledgeAreas: 2,
      criticalKnowledgeAreas: 2,
      atRiskKnowledgeAreas: 2,
      averageEffectiveExpertCount: 0,
    });
    const departments = await service.departments({
      asOf,
      page: 2,
      pageSize: 1,
    });
    expect(departments.meta).toEqual({
      page: 2,
      pageSize: 1,
      total: 2,
      totalPages: 2,
    });
    expect(departments.data.map((entry) => entry.department.id)).toEqual([
      "dep_b",
    ]);
  });
  it("uses uncapped, unrounded phase-three evidence scores for concentration", async () => {
    const { service, prisma } = fixture();
    prisma.evidence.findMany.mockResolvedValue([
      {
        knowledgeAreaId: "ka_a",
        employeeId: "emp_a",
        type: "DOCUMENT_AUTHORED",
        strength: 1,
        occurredAt: new Date("2026-08-01T00:00:00Z"),
      },
      {
        knowledgeAreaId: "ka_a",
        employeeId: "emp_b",
        type: "TICKET_RESOLVED",
        strength: 0.2,
        occurredAt: new Date("2026-08-15T00:00:00Z"),
      },
    ]);
    const result = await service.forKnowledge("ka_a", { asOf });
    expect(result.data.effectiveExpertCount).toBeGreaterThan(1);
    expect(result.data.effectiveExpertCount).toBeLessThan(2);
    expect(result.data.evidenceCount).toBe(2);
    expect(result.data.factors.documentationGap).toBe(0);
    expect(result.data.riskScore).toBeLessThan(75);
  });
  it("names each high-risk area's primary holder without changing the area risk response", async () => {
    const { service, prisma } = fixture();
    const row = (employeeId: string, strength: number) => ({
      knowledgeAreaId: "ka_a",
      employeeId,
      type: "INCIDENT_RESOLVED",
      strength,
      occurredAt: new Date("2026-08-15T00:00:00Z"),
    });
    // emp_b and emp_c tie at the top; the lower ID wins deterministically.
    prisma.evidence.findMany.mockResolvedValue([
      row("emp_a", 0.4),
      row("emp_c", 0.9),
      row("emp_b", 0.9),
    ]);
    prisma.employee.findMany.mockResolvedValue([{ id: "emp_b", name: "Bea" }]);
    const result = await service.highRisk({ asOf, page: 1, pageSize: 10 });
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["emp_b"] } },
      select: { id: true, name: true },
    });
    const byArea = Object.fromEntries(
      result.data.map((entry) => [entry.knowledgeArea.id, entry.primaryHolder]),
    );
    expect(byArea).toEqual({ ka_a: { id: "emp_b", name: "Bea" }, ka_b: null });
    const area = await service.forKnowledge("ka_a", { asOf });
    expect(area.data).not.toHaveProperty("primaryHolderId");
    expect(area.data).not.toHaveProperty("primaryHolder");
  });
  it("returns not found for unknown areas", async () => {
    const { service, prisma } = fixture();
    prisma.knowledgeArea.findUnique.mockResolvedValue(null);
    await expect(
      service.forKnowledge("ka_missing", { asOf }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
  it("captures the current input state once per UTC date and formula version", async () => {
    const { service, prisma } = fixture();
    const result = await service.capture("ka_a");
    expect(prisma.knowledgeRiskSnapshot.upsert).toHaveBeenCalledOnce();
    expect(prisma.knowledgeRiskSnapshot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          knowledgeAreaId_snapshotDate_formulaVersion: {
            knowledgeAreaId: "ka_a",
            snapshotDate: result.snapshotDate,
            formulaVersion: "risk-v1",
          },
        },
        create: expect.objectContaining({
          knowledgeAreaId: "ka_a",
          businessCriticality: 1,
          effectiveExpertCount: 0,
          evidenceCount: 0,
          factors: {
            businessCriticality: 1,
            concentration: 1,
            freshness: 1,
            documentationGap: 1,
          },
        }) as unknown,
        update: {},
      }) as unknown,
    );
  });
});
