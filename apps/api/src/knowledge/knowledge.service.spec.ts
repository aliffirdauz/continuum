import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../database/prisma.service";
import { KnowledgeService } from "./knowledge.service";

describe("KnowledgeService", () => {
  const manufacturing = { id: "dep_manufacturing", name: "Manufacturing" };
  const line4 = {
    id: "ka_line4_troubleshooting",
    name: "Production Line 4 Troubleshooting",
    description: "Diagnosing Line 4 stoppages.",
    category: "Manufacturing Operations",
    status: "ACTIVE",
    businessCriticality: 0.96,
    knowledgeDecayRate: 0.02,
    department: manufacturing,
    _count: { businessObjects: 2 },
  };

  function createService() {
    const prisma = {
      $transaction: vi.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
      knowledgeArea: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      evidence: { groupBy: vi.fn() },
      employee: { findMany: vi.fn() },
    };

    return {
      prisma,
      service: new KnowledgeService(prisma as unknown as PrismaService),
    };
  }

  it("summarizes evidence activity for each listed knowledge area", async () => {
    const { prisma, service } = createService();
    const hydraulics = {
      ...line4,
      id: "ka_hydraulic_calibration",
      name: "Hydraulic Calibration",
      _count: { businessObjects: 0 },
    };
    prisma.knowledgeArea.findMany.mockResolvedValue([line4, hydraulics]);
    prisma.knowledgeArea.count.mockResolvedValue(2);
    prisma.evidence.groupBy.mockResolvedValue([
      {
        knowledgeAreaId: line4.id,
        employeeId: "emp_budi",
        _count: { _all: 10 },
        _max: { occurredAt: new Date("2026-08-23T00:00:00.000Z") },
      },
      {
        knowledgeAreaId: line4.id,
        employeeId: "emp_andri",
        _count: { _all: 4 },
        _max: { occurredAt: new Date("2026-08-04T00:00:00.000Z") },
      },
    ]);

    const result = await service.list({
      page: 1,
      pageSize: 20,
      sort: "criticality",
    });

    expect(result.meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
    expect(result.data[0]).toEqual({
      id: line4.id,
      name: line4.name,
      description: line4.description,
      category: line4.category,
      status: "ACTIVE",
      businessCriticality: 0.96,
      knowledgeDecayRate: 0.02,
      department: manufacturing,
      businessObjectCount: 2,
      evidenceCount: 14,
      contributorCount: 2,
      lastEvidenceAt: new Date("2026-08-23T00:00:00.000Z"),
    });
    expect(result.data[1]).toMatchObject({
      businessObjectCount: 0,
      evidenceCount: 0,
      contributorCount: 0,
      lastEvidenceAt: null,
    });
    expect(prisma.evidence.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { knowledgeAreaId: { in: [line4.id, hydraulics.id] } },
      }),
    );
  });

  it("returns 404 for an unknown knowledge area", async () => {
    const { prisma, service } = createService();
    prisma.knowledgeArea.findUnique.mockResolvedValue(null);

    await expect(service.findOne("ka_missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.evidence.groupBy).not.toHaveBeenCalled();
  });

  it("returns business objects, evidence by type, and people with evidence", async () => {
    const { prisma, service } = createService();
    const productionLine = {
      id: "bo_production_line_4",
      name: "Production Line 4",
      type: "MACHINE",
      criticality: 0.96,
      department: manufacturing,
    };
    prisma.knowledgeArea.findUnique.mockResolvedValue({
      ...line4,
      createdAt: new Date("2026-09-01T00:00:00.000Z"),
      updatedAt: new Date("2026-09-02T00:00:00.000Z"),
      businessObjects: [{ impactWeight: 1, businessObject: productionLine }],
    });
    prisma.evidence.groupBy.mockResolvedValue([
      {
        employeeId: "emp_budi",
        type: "MAINTENANCE_ACTIVITY",
        _count: { _all: 4 },
        _max: { occurredAt: new Date("2026-08-16T00:00:00.000Z") },
      },
      {
        employeeId: "emp_budi",
        type: "INCIDENT_RESOLVED",
        _count: { _all: 3 },
        _max: { occurredAt: new Date("2026-08-23T00:00:00.000Z") },
      },
      {
        employeeId: "emp_andri",
        type: "MAINTENANCE_ACTIVITY",
        _count: { _all: 2 },
        _max: { occurredAt: new Date("2026-08-04T00:00:00.000Z") },
      },
    ]);
    const andri = {
      id: "emp_andri",
      name: "Andri Pratama",
      jobTitle: "Maintenance Engineer",
      status: "ACTIVE",
      department: manufacturing,
    };
    const budi = {
      ...andri,
      id: "emp_budi",
      name: "Budi Santoso",
      jobTitle: "Senior Maintenance Engineer",
    };
    prisma.employee.findMany.mockResolvedValue([andri, budi]);

    const result = await service.findOne(line4.id);

    expect(result).toMatchObject({
      evidenceCount: 9,
      contributorCount: 2,
      lastEvidenceAt: new Date("2026-08-23T00:00:00.000Z"),
      evidenceByType: [
        { type: "MAINTENANCE_ACTIVITY", count: 6 },
        { type: "INCIDENT_RESOLVED", count: 3 },
      ],
      businessObjects: [{ ...productionLine, impactWeight: 1 }],
    });
    expect(result.contributors).toEqual([
      {
        ...andri,
        evidenceCount: 2,
        lastEvidenceAt: new Date("2026-08-04T00:00:00.000Z"),
        evidenceTypes: ["MAINTENANCE_ACTIVITY"],
      },
      {
        ...budi,
        evidenceCount: 7,
        lastEvidenceAt: new Date("2026-08-23T00:00:00.000Z"),
        evidenceTypes: ["MAINTENANCE_ACTIVITY", "INCIDENT_RESOLVED"],
      },
    ]);
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["emp_budi", "emp_andri"] } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    );
  });
});
