import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../database/prisma.service";
import { TransfersService } from "./transfers.service";

const now = new Date("2026-10-08T09:00:00Z");
const area = {
  id: "ka_safety",
  name: "Safety approval",
  businessCriticality: 0.8,
  knowledgeDecayRate: 0.02,
  department: { id: "dep_ops", name: "Operations" },
};
const person = (id: string) => ({
  id,
  name: id,
  jobTitle: "Engineer",
  status: "ACTIVE",
  department: { id: "dep_ops", name: "Operations" },
});
const evidence = [
  {
    knowledgeAreaId: "ka_safety",
    employeeId: "emp_primary",
    type: "INCIDENT_RESOLVED",
    strength: 1,
    occurredAt: new Date("2026-09-20T00:00:00Z"),
  },
  {
    knowledgeAreaId: "ka_safety",
    employeeId: "emp_primary",
    type: "DOCUMENT_AUTHORED",
    strength: 1,
    occurredAt: new Date("2026-09-01T00:00:00Z"),
  },
  {
    knowledgeAreaId: "ka_safety",
    employeeId: "emp_backup",
    type: "TRAINING_COMPLETED",
    strength: 0.5,
    occurredAt: new Date("2026-09-10T00:00:00Z"),
  },
];
const detail = {
  id: "plan_1",
  status: "PLANNED",
  targetCoverage: 70,
  baselineCoverage: 3,
  targetDate: new Date("2026-12-31T00:00:00Z"),
  startedAt: null,
  completedAt: null,
  createdAt: now,
  primaryHolderId: "emp_primary",
  backupEmployeeId: "emp_backup",
  knowledgeArea: area,
  primaryHolder: person("emp_primary"),
  backupEmployee: person("emp_backup"),
  activities: [],
  checkpoints: [],
};

function fixture() {
  const prisma = {
    knowledgeArea: { findUnique: vi.fn().mockResolvedValue(area) },
    employee: {
      findMany: vi.fn().mockResolvedValue([
        { id: "emp_primary", status: "ACTIVE" },
        { id: "emp_backup", status: "ACTIVE" },
      ]),
    },
    evidence: {
      findMany: vi.fn().mockResolvedValue(evidence),
      create: vi.fn().mockResolvedValue({ id: "ev_new" }),
    },
    knowledgeTransferPlan: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: "plan_1" }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn().mockResolvedValue(detail),
    },
    transferActivity: {
      create: vi.fn().mockResolvedValue({ id: "act_1" }),
      findFirst: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    transferCheckpoint: { create: vi.fn().mockResolvedValue({}) },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn(),
  };
  prisma.$transaction.mockImplementation((work: (tx: unknown) => unknown) =>
    work(prisma),
  );
  return {
    prisma,
    service: new TransfersService(
      prisma as unknown as PrismaService,
      () => now,
    ),
  };
}
const valid = {
  knowledgeAreaId: "ka_safety",
  primaryHolderId: "emp_primary",
  backupEmployeeId: "emp_backup",
  targetDate: "2026-12-31",
};

describe("creating a transfer plan", () => {
  it("captures the backup's baseline coverage and a baseline checkpoint", async () => {
    const { prisma, service } = fixture();
    const result = await service.create(valid, "usr_manager");
    const created = prisma.knowledgeTransferPlan.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(created.data).toMatchObject({
      knowledgeAreaId: "ka_safety",
      targetCoverage: 70,
      createdById: "usr_manager",
      targetDate: new Date("2026-12-31T00:00:00Z"),
    });
    expect(created.data.baselineCoverage).toBeGreaterThan(0);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    const baseline = prisma.transferCheckpoint.create.mock.calls[0]![0] as {
      data: Record<string, unknown>;
    };
    expect(baseline.data).toMatchObject({
      transferPlanId: "plan_1",
      activityId: null,
      capturedAt: now,
      formulaVersion: "risk-v1",
      mappingVersion: "transfer-v1",
    });
    expect(result.data).toMatchObject({
      id: "plan_1",
      coverage: { baseline: 3, target: 70 },
      recommendations: { band: "FOUNDATION" },
    });
  });

  it.each([
    [{ backupEmployeeId: "emp_primary" }, BadRequestException],
    [{ targetDate: "2026-10-07" }, BadRequestException],
    [{ targetDate: "2026-02-30" }, BadRequestException],
    [{ targetDate: "2028-12-31" }, BadRequestException],
    [{ targetCoverage: 1 }, BadRequestException],
  ])("rejects %o", async (change, error) => {
    const { prisma, service } = fixture();
    await expect(
      service.create({ ...valid, ...change }, "usr"),
    ).rejects.toThrow(error);
    expect(prisma.knowledgeTransferPlan.create).not.toHaveBeenCalled();
  });

  it("accepts today as the target date", async () => {
    const { service } = fixture();
    await expect(
      service.create({ ...valid, targetDate: "2026-10-08" }, "usr"),
    ).resolves.toBeDefined();
  });

  it("returns 404 for unknown areas or people and 400 for inactive people", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeArea.findUnique.mockResolvedValueOnce(null);
    await expect(service.create(valid, "usr")).rejects.toThrow(
      NotFoundException,
    );
    prisma.employee.findMany.mockResolvedValueOnce([
      { id: "emp_primary", status: "ACTIVE" },
    ]);
    await expect(service.create(valid, "usr")).rejects.toThrow(
      NotFoundException,
    );
    prisma.employee.findMany.mockResolvedValueOnce([
      { id: "emp_primary", status: "ACTIVE" },
      { id: "emp_backup", status: "ON_LEAVE" },
    ]);
    await expect(service.create(valid, "usr")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("requires the primary holder to hold expertise in the area", async () => {
    const { service } = fixture();
    await expect(
      service
        .create({ ...valid, primaryHolderId: "emp_other" }, "usr")
        .catch((error: unknown) => error),
    ).resolves.toBeInstanceOf(NotFoundException);
    const { prisma, service: second } = fixture();
    prisma.employee.findMany.mockResolvedValueOnce([
      { id: "emp_other", status: "ACTIVE" },
      { id: "emp_backup", status: "ACTIVE" },
    ]);
    await expect(
      second.create({ ...valid, primaryHolderId: "emp_other" }, "usr"),
    ).rejects.toThrow(/no recorded expertise/);
  });

  it("refuses a second open plan for the same area and backup", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findFirst.mockResolvedValueOnce({
      id: "open",
    });
    await expect(service.create(valid, "usr")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.knowledgeTransferPlan.create).not.toHaveBeenCalled();
  });
});

describe("updating plan status", () => {
  const planRow = (status: string, startedAt: Date | null = null) => ({
    id: "plan_1",
    status,
    startedAt,
    primaryHolderId: "emp_primary",
    backupEmployeeId: "emp_backup",
    knowledgeArea: area,
    _count: { activities: 0 },
  });

  it("starts a planned plan and stamps the start time", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findUnique
      .mockResolvedValueOnce(planRow("PLANNED"))
      .mockResolvedValueOnce(detail);
    await service.update("plan_1", { status: "IN_PROGRESS" });
    expect(prisma.knowledgeTransferPlan.updateMany).toHaveBeenCalledWith({
      where: { id: "plan_1", status: "PLANNED" },
      data: { status: "IN_PROGRESS", startedAt: now },
    });
  });

  it("stamps completion and rejects changes after it", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findUnique
      .mockResolvedValueOnce(planRow("IN_PROGRESS", now))
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce(planRow("COMPLETED", now));
    await service.update("plan_1", { status: "COMPLETED" });
    expect(prisma.knowledgeTransferPlan.updateMany).toHaveBeenCalledWith({
      where: { id: "plan_1", status: "IN_PROGRESS" },
      data: { status: "COMPLETED", completedAt: now },
    });
    await expect(
      service.update("plan_1", { status: "IN_PROGRESS" }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects empty bodies, invalid transitions, and stale writes", async () => {
    const { prisma, service } = fixture();
    await expect(service.update("plan_1", {})).rejects.toThrow(
      BadRequestException,
    );
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce(
      planRow("PLANNED"),
    );
    await expect(
      service.update("plan_1", { status: "COMPLETED" }),
    ).rejects.toThrow(ConflictException);
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce(
      planRow("PLANNED"),
    );
    prisma.knowledgeTransferPlan.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.update("plan_1", { status: "BLOCKED" }),
    ).rejects.toThrow(ConflictException);
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.update("plan_missing", { status: "BLOCKED" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("guards activities on blocked plans and caps their number", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce(
      planRow("BLOCKED"),
    );
    await expect(
      service.addActivity("plan_1", { type: "TRAINING", title: "Course" }),
    ).rejects.toThrow(ConflictException);
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce({
      ...planRow("PLANNED"),
      _count: { activities: 100 },
    });
    await expect(
      service.addActivity("plan_1", { type: "TRAINING", title: "Course" }),
    ).rejects.toThrow(BadRequestException);
    prisma.knowledgeTransferPlan.findUnique
      .mockResolvedValueOnce(planRow("PLANNED"))
      .mockResolvedValueOnce(detail);
    await service.addActivity("plan_1", { type: "TRAINING", title: "Course" });
    expect(prisma.transferActivity.create).toHaveBeenCalledWith({
      data: {
        transferPlanId: "plan_1",
        type: "TRAINING",
        title: "Course",
        description: null,
        weight: 1,
      },
    });
  });
});

describe("completing an activity", () => {
  const plan = {
    id: "plan_1",
    status: "PLANNED",
    startedAt: null,
    primaryHolderId: "emp_primary",
    backupEmployeeId: "emp_backup",
    knowledgeArea: area,
    _count: { activities: 1 },
  };
  const activity = {
    id: "act_1",
    type: "PAIR_WORK",
    title: "Pair on a permit review",
    description: null,
    status: "PLANNED",
    weight: 0.8,
  };

  it("records traceable evidence, starts the plan, and captures a checkpoint", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findUnique
      .mockResolvedValueOnce(plan)
      .mockResolvedValueOnce(detail);
    prisma.transferActivity.findFirst.mockResolvedValueOnce(activity);
    const newEvidence = {
      knowledgeAreaId: "ka_safety",
      employeeId: "emp_backup",
      type: "PROJECT_PARTICIPATION",
      strength: 0.8,
      occurredAt: now,
    };
    prisma.evidence.findMany
      .mockResolvedValueOnce([...evidence, newEvidence])
      .mockResolvedValueOnce([...evidence, newEvidence]);
    await service.completeActivity("plan_1", "act_1");
    expect(prisma.evidence.create).toHaveBeenCalledWith({
      data: {
        employeeId: "emp_backup",
        knowledgeAreaId: "ka_safety",
        type: "PROJECT_PARTICIPATION",
        title: "Pair on a permit review",
        description: null,
        source: "Transfer plan",
        sourceReference: "act_1",
        strength: 0.8,
        occurredAt: now,
        metadata: {
          transferPlanId: "plan_1",
          transferActivityId: "act_1",
          activityType: "PAIR_WORK",
          mappingVersion: "transfer-v1",
        },
      },
      select: { id: true },
    });
    expect(prisma.transferActivity.updateMany).toHaveBeenCalledWith({
      where: { id: "act_1", status: "PLANNED" },
      data: { status: "COMPLETED", completedAt: now, evidenceId: "ev_new" },
    });
    expect(prisma.knowledgeTransferPlan.updateMany).toHaveBeenCalledWith({
      where: { id: "plan_1", status: { in: ["PLANNED", "IN_PROGRESS"] } },
      data: { status: "IN_PROGRESS", startedAt: now },
    });
    const checkpoint = prisma.transferCheckpoint.create.mock.calls[0]![0] as {
      data: { activityId: string; backupScore: number };
    };
    expect(checkpoint.data.activityId).toBe("act_1");
    const before = (await fixture().service.create(valid, "usr")).data.coverage
      .baseline;
    expect(checkpoint.data.backupScore).toBeGreaterThan(before);
  });

  it("returns 404, 409 for repeats or blocked plans, and rolls back a lost race", async () => {
    const { prisma, service } = fixture();
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValue(plan);
    prisma.transferActivity.findFirst.mockResolvedValueOnce(null);
    await expect(service.completeActivity("plan_1", "act_x")).rejects.toThrow(
      NotFoundException,
    );
    prisma.transferActivity.findFirst.mockResolvedValueOnce({
      ...activity,
      status: "COMPLETED",
    });
    await expect(service.completeActivity("plan_1", "act_1")).rejects.toThrow(
      ConflictException,
    );
    prisma.knowledgeTransferPlan.findUnique.mockResolvedValueOnce({
      ...plan,
      status: "BLOCKED",
    });
    prisma.transferActivity.findFirst.mockResolvedValueOnce(activity);
    await expect(service.completeActivity("plan_1", "act_1")).rejects.toThrow(
      ConflictException,
    );
    prisma.transferActivity.findFirst.mockResolvedValueOnce(activity);
    prisma.transferActivity.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.completeActivity("plan_1", "act_1")).rejects.toThrow(
      ConflictException,
    );
    expect(prisma.transferCheckpoint.create).not.toHaveBeenCalled();
  });
});

describe("transfer candidates", () => {
  it("lists holders by score, candidates by name, and flags open plans", async () => {
    const { prisma, service } = fixture();
    prisma.employee.findMany.mockResolvedValueOnce([
      person("emp_backup"),
      person("emp_new"),
      person("emp_primary"),
    ]);
    prisma.knowledgeTransferPlan.findMany.mockResolvedValueOnce([
      { id: "plan_open", backupEmployeeId: "emp_backup" },
    ]);
    const { data } = await service.candidates("ka_safety");
    expect(data.holders.map(({ employee }) => employee.id)).toEqual([
      "emp_primary",
      "emp_backup",
    ]);
    expect(data.candidates.map(({ employee }) => employee.id)).toEqual([
      "emp_backup",
      "emp_new",
      "emp_primary",
    ]);
    expect(data.candidates[0]!.openPlanId).toBe("plan_open");
    expect(data.candidates[1]).toMatchObject({
      expertiseScore: 0,
      openPlanId: null,
    });
    prisma.knowledgeArea.findUnique.mockResolvedValueOnce(null);
    await expect(service.candidates("ka_missing")).rejects.toThrow(
      NotFoundException,
    );
  });
});
