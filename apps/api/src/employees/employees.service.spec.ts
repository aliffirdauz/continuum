import { NotFoundException } from "@nestjs/common";

import type { PrismaService } from "../database/prisma.service";
import { EmployeesService, buildEmployeeWhere } from "./employees.service";

describe("EmployeesService", () => {
  const budi = {
    id: "emp_budi",
    name: "Budi Santoso",
    email: "budi.santoso@northstar.demo",
    jobTitle: "Senior Maintenance Engineer",
    location: "Bekasi Plant",
    status: "ACTIVE",
    joinedAt: new Date("2011-03-14T00:00:00.000Z"),
    avatarUrl: null,
    department: { id: "dep_manufacturing", name: "Manufacturing" },
  };

  function createService() {
    const prisma = {
      $transaction: vi.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
      employee: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
      evidence: { groupBy: vi.fn() },
      knowledgeArea: { findMany: vi.fn() },
    };

    return {
      prisma,
      service: new EmployeesService(prisma as unknown as PrismaService),
    };
  }

  it("searches names and job titles without exposing other filters", () => {
    expect(buildEmployeeWhere({ search: "engineer" })).toEqual({
      departmentId: undefined,
      status: undefined,
      OR: [
        { name: { contains: "engineer", mode: "insensitive" } },
        { jobTitle: { contains: "engineer", mode: "insensitive" } },
      ],
    });
  });

  it("lists people alphabetically with the number of knowledge areas they have evidence in", async () => {
    const { prisma, service } = createService();
    prisma.employee.findMany.mockResolvedValue([budi]);
    prisma.employee.count.mockResolvedValue(1);
    prisma.evidence.groupBy.mockResolvedValue(
      ["ka_line4_troubleshooting", "ka_hydraulic_calibration"].map(
        (knowledgeAreaId) => ({
          employeeId: budi.id,
          knowledgeAreaId,
          _count: { _all: 5 },
          _max: { occurredAt: new Date("2026-08-23T00:00:00.000Z") },
        }),
      ),
    );

    const result = await service.list({ page: 1, pageSize: 20 });

    expect(result.data).toEqual([{ ...budi, knowledgeAreaCount: 2 }]);
    expect(result.data[0]).not.toHaveProperty("evidenceCount");
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    );
  });

  it("returns a profile with knowledge areas and no score", async () => {
    const { prisma, service } = createService();
    prisma.employee.findUnique.mockResolvedValue(budi);
    prisma.evidence.groupBy.mockResolvedValue([
      {
        knowledgeAreaId: "ka_line4_troubleshooting",
        type: "INCIDENT_RESOLVED",
        _count: { _all: 3 },
        _max: { occurredAt: new Date("2026-08-23T00:00:00.000Z") },
      },
    ]);
    prisma.knowledgeArea.findMany.mockResolvedValue([
      {
        id: "ka_line4_troubleshooting",
        name: "Production Line 4 Troubleshooting",
        category: "Manufacturing Operations",
        businessCriticality: 0.96,
        department: budi.department,
      },
    ]);

    const result = await service.findOne(budi.id);

    expect(result.knowledgeAreaCount).toBe(1);
    expect(result.knowledgeAreas[0]).toMatchObject({
      id: "ka_line4_troubleshooting",
      evidenceCount: 3,
      evidenceTypes: ["INCIDENT_RESOLVED"],
    });
    expect(JSON.stringify(result)).not.toMatch(/score|rank/i);
  });

  it("returns 404 for an unknown person", async () => {
    const { prisma, service } = createService();
    prisma.employee.findUnique.mockResolvedValue(null);

    await expect(service.findOne("emp_missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.assertExists("emp_missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
