import { NotFoundException, BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../database/prisma.service";
import { SimulationsService } from "./simulations.service";

const now = new Date("2026-09-01T00:00:00Z");
const row = {
  employeeId: "emp_a",
  knowledgeAreaId: "ka_a",
  type: "DOCUMENT_AUTHORED",
  strength: 1,
  occurredAt: new Date("2026-08-01T00:00:00Z"),
};
function fixture() {
  const prisma = {
    employee: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ id: "emp_a", name: "Ada", status: "ACTIVE" }),
    },
    knowledgeArea: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "ka_a",
          name: "Area",
          businessCriticality: 0.8,
          knowledgeDecayRate: 0.02,
          department: { id: "dep_a", name: "Ops" },
          businessObjects: [
            {
              impactWeight: 0.8,
              businessObject: {
                id: "bo_a",
                name: "Machine",
                type: "MACHINE",
                criticality: 0.9,
              },
            },
          ],
        },
      ]),
    },
    evidence: { findMany: vi.fn().mockResolvedValue([row]) },
    simulationRun: {
      create: vi.fn((args: { data: Record<string, unknown> }) =>
        Promise.resolve(args.data),
      ),
      findUnique: vi.fn(),
    },
  };
  return {
    prisma,
    service: new SimulationsService(
      prisma as unknown as PrismaService,
      () => now,
    ),
  };
}

describe("simulation persistence", () => {
  it("captures a bounded same-horizon result and returns unchanged saved JSON only to its creator", async () => {
    const { prisma, service } = fixture();
    const created = await service.create(
      { employeeId: "emp_a", durationDays: 30 },
      "manager_a",
    );
    expect(created.data).toMatchObject({
      employee: { id: "emp_a" },
      startedAt: now.toISOString(),
      horizonAt: "2026-10-01T00:00:00.000Z",
      durationDays: 30,
      summary: { affectedAreas: 1, affectedObjects: 1 },
      areas: [{ knowledgeArea: { id: "ka_a" } }],
      objects: [{ id: "bo_a", affectedAreaIds: ["ka_a"] }],
    });
    expect(created.data.areas[0]!.before.coverage).toBeGreaterThan(
      created.data.areas[0]!.after.coverage,
    );
    expect(prisma.evidence.findMany).toHaveBeenCalledTimes(1);
    prisma.simulationRun.findUnique.mockResolvedValue({
      createdById: "manager_a",
      result: created.data,
    });
    expect(await service.get("sim_1", "manager_a", "MANAGER")).toEqual(created);
    expect(prisma.simulationRun.create).toHaveBeenCalledTimes(1);
    await expect(service.get("sim_1", "manager_b", "MANAGER")).rejects.toThrow(
      NotFoundException,
    );
    expect(await service.get("sim_1", "admin", "KNOWLEDGE_ADMIN")).toEqual(
      created,
    );
  });
  it("responds with the persisted JSON so a later read is identical", async () => {
    const { prisma, service } = fixture();
    // JSONB storage can normalize the last digits of a float.
    prisma.simulationRun.create.mockImplementation(({ data }) => {
      const result = structuredClone(data.result) as {
        areas: Array<{ before: { coverage: number } }>;
      };
      result.areas[0]!.before.coverage = 12.34;
      return Promise.resolve({ ...data, result });
    });
    const created = await service.create(
      { employeeId: "emp_a", durationDays: 30 },
      "manager_a",
    );
    expect(created.data.areas[0]!.before.coverage).toBe(12.34);
  });
  it("pages default responses but persists the complete bounded result", async () => {
    const { prisma, service } = fixture();
    const area = {
      id: "ka_a",
      name: "Area",
      businessCriticality: 0.8,
      knowledgeDecayRate: 0.02,
      department: { id: "dep_a", name: "Ops" },
      businessObjects: [],
    };
    prisma.knowledgeArea.findMany.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        ...area,
        id: `ka_${index}`,
      })),
    );
    const response = await service.create(
      { employeeId: "emp_a", durationDays: 30 },
      "manager_a",
    );
    expect(response.data.areas).toHaveLength(20);
    expect(response.meta).toMatchObject({
      areasTotal: 21,
      page: 1,
      pageSize: 20,
    });
    const saved = prisma.simulationRun.create.mock.calls[0]?.[0] as
      { data: { result: { areas: unknown[] } } } | undefined;
    expect(saved?.data.result.areas).toHaveLength(21);
  });
  it("orders areas by coverage loss with ID tie-breaks, deduplicates objects, and filters only the view", async () => {
    const { prisma, service } = fixture();
    const machine = {
      impactWeight: 0.5,
      businessObject: {
        id: "bo_a",
        name: "Machine",
        type: "MACHINE",
        criticality: 0.9,
      },
    };
    const area = (id: string, departmentId: string) => ({
      id,
      name: id,
      businessCriticality: 0.8,
      knowledgeDecayRate: 0.02,
      department: { id: departmentId, name: departmentId },
      businessObjects: [machine],
    });
    prisma.knowledgeArea.findMany.mockResolvedValue([
      area("ka_a", "dep_a"),
      area("ka_b", "dep_a"),
      area("ka_c", "dep_b"),
      area("ka_z", "dep_b"),
    ]);
    // Coverage is additive, so ka_a-ka_c lose the same coverage. ka_z loses
    // more (stronger evidence); ka_a's second holder makes its risk rise.
    prisma.evidence.findMany.mockResolvedValue([
      ...["ka_a", "ka_b", "ka_c", "ka_z"].map((knowledgeAreaId) => ({
        ...row,
        knowledgeAreaId,
      })),
      { ...row, knowledgeAreaId: "ka_a", employeeId: "emp_b" },
      { ...row, knowledgeAreaId: "ka_z", type: "INCIDENT_RESOLVED" },
    ]);
    const { data } = await service.create(
      { employeeId: "emp_a", durationDays: 30 },
      "manager_a",
    );
    expect(data.areas.map(({ knowledgeArea }) => knowledgeArea.id)).toEqual([
      "ka_z",
      "ka_a",
      "ka_b",
      "ka_c",
    ]);
    expect(data.objects).toEqual([
      expect.objectContaining({
        id: "bo_a",
        affectedAreaIds: ["ka_a", "ka_b", "ka_c", "ka_z"],
      }),
    ]);
    const saved = prisma.simulationRun.create.mock.calls[0]?.[0] as {
      data: { result: unknown };
    };
    prisma.simulationRun.findUnique.mockResolvedValue({
      createdById: "manager_a",
      result: saved.data.result,
    });
    const filtered = await service.get("sim_1", "manager_a", "MANAGER", {
      departmentId: "dep_a",
    });
    expect(
      filtered.data.areas.map(({ knowledgeArea }) => knowledgeArea.id),
    ).toEqual(["ka_a", "ka_b"]);
    expect(filtered.data.objects[0]?.affectedAreaIds).toEqual(["ka_a", "ka_b"]);
    expect(filtered.meta).toMatchObject({ areasTotal: 2, objectsTotal: 1 });
    const unfiltered = await service.get("sim_1", "manager_a", "MANAGER");
    expect(unfiltered.meta.areasTotal).toBe(4);
  });
  it("rejects a run above the 500-area cap instead of truncating it", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeArea.findMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, index) => ({ id: `ka_${index}` })),
    );
    await expect(
      service.create({ employeeId: "emp_a", durationDays: 30 }, "manager_a"),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.evidence.findMany).not.toHaveBeenCalled();
    expect(prisma.simulationRun.create).not.toHaveBeenCalled();
  });
  it("rejects inactive and unknown employees", async () => {
    const { prisma, service } = fixture();
    prisma.employee.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "emp_a", status: "ON_LEAVE" });
    await expect(
      service.create({ employeeId: "emp_a", durationDays: 30 }, "manager_a"),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.create({ employeeId: "emp_a", durationDays: 30 }, "manager_a"),
    ).rejects.toThrow(BadRequestException);
  });
  it("returns empty totals for a known employee without evidence", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeArea.findMany.mockResolvedValue([]);
    const { data } = await service.create(
      { employeeId: "emp_a", durationDays: 1 },
      "manager_a",
    );
    expect(data.summary).toMatchObject({
      affectedAreas: 0,
      affectedObjects: 0,
      beforeCoverage: 0,
      afterCoverage: 0,
    });
    expect(data.areas).toEqual([]);
  });
});
