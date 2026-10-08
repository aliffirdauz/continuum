import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Prisma, TransferPlanStatus } from "@prisma/client";

import { paginate, toSkipTake } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import { isMeaningfulExpertise, scoreExpertise } from "../expertise/scoring";
import {
  ACTIVITY_EVIDENCE_TYPE,
  TRANSFER_EVIDENCE_SOURCE,
  TRANSFER_MAPPING_VERSION,
  TRANSFER_STATUSES,
  assessArea,
  canTransition,
  coverageProgress,
  recommendActivities,
} from "./transfer";
import type {
  CreateActivityDto,
  CreateTransferDto,
  TransferListQueryDto,
  UpdateTransferDto,
} from "./transfers.dto";

export const TRANSFER_CLOCK = "TRANSFER_CLOCK";
const DEFAULT_TARGET_COVERAGE = 70;
const MAX_TARGET_DAYS = 730;
const MAX_ACTIVITIES = 100;
const DAY_IN_MS = 86_400_000;

const personSelect = {
  id: true,
  name: true,
  jobTitle: true,
  status: true,
  department: departmentReference,
} satisfies Prisma.EmployeeSelect;
const areaSelect = {
  id: true,
  name: true,
  businessCriticality: true,
  knowledgeDecayRate: true,
  department: departmentReference,
} satisfies Prisma.KnowledgeAreaSelect;
const planSelect = {
  id: true,
  status: true,
  targetCoverage: true,
  baselineCoverage: true,
  targetDate: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
  primaryHolderId: true,
  backupEmployeeId: true,
  knowledgeArea: { select: areaSelect },
  primaryHolder: { select: personSelect },
  backupEmployee: { select: personSelect },
  activities: { select: { status: true } },
} satisfies Prisma.KnowledgeTransferPlanSelect;
const evidenceSelect = {
  knowledgeAreaId: true,
  employeeId: true,
  type: true,
  strength: true,
  occurredAt: true,
} satisfies Prisma.EvidenceSelect;

type Plan = Prisma.KnowledgeTransferPlanGetPayload<{
  select: typeof planSelect;
}>;
type Area = Prisma.KnowledgeAreaGetPayload<{ select: typeof areaSelect }>;
type EvidenceRow = Prisma.EvidenceGetPayload<{ select: typeof evidenceSelect }>;
type Db = Prisma.TransactionClient | PrismaService;

const oneDecimal = (value: number) => Number(value.toFixed(1));
const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const person = ({ id, name, jobTitle, department }: Plan["primaryHolder"]) => ({
  id,
  name,
  jobTitle,
  department,
});

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(TRANSFER_CLOCK)
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private async evidenceFor(db: Db, areaIds: string[], asOf: Date) {
    const rows = areaIds.length
      ? await db.evidence.findMany({
          where: {
            knowledgeAreaId: { in: areaIds },
            occurredAt: { lte: asOf },
          },
          select: evidenceSelect,
        })
      : [];
    const byArea = new Map<string, EvidenceRow[]>();
    for (const row of rows)
      byArea.set(row.knowledgeAreaId, [
        ...(byArea.get(row.knowledgeAreaId) ?? []),
        row,
      ]);
    return byArea;
  }

  private assess(
    area: Area,
    evidence: readonly EvidenceRow[],
    plan: { primaryHolderId: string; backupEmployeeId: string },
    asOf: Date,
  ) {
    return assessArea({
      asOf,
      businessCriticality: area.businessCriticality,
      knowledgeDecayRate: area.knowledgeDecayRate,
      evidence,
      primaryHolderId: plan.primaryHolderId,
      backupEmployeeId: plan.backupEmployeeId,
    });
  }

  private summary(plan: Plan, live: ReturnType<typeof assessArea>) {
    const { knowledgeDecayRate: _decay, ...knowledgeArea } = plan.knowledgeArea;
    void _decay;
    return {
      id: plan.id,
      status: plan.status,
      knowledgeArea,
      primaryHolder: person(plan.primaryHolder),
      backupEmployee: person(plan.backupEmployee),
      coverage: {
        baseline: plan.baselineCoverage,
        current: live.backupScore,
        target: plan.targetCoverage,
        progress: coverageProgress(
          plan.baselineCoverage,
          live.backupScore,
          plan.targetCoverage,
        ),
        targetMet: live.backupScore >= plan.targetCoverage,
      },
      risk: {
        riskScore: oneDecimal(live.riskScore),
        riskLevel: live.riskLevel,
        effectiveExpertCount: live.effectiveExpertCount,
        formulaVersion: live.formulaVersion,
      },
      activities: {
        total: plan.activities.length,
        completed: plan.activities.filter(
          ({ status }) => status === "COMPLETED",
        ).length,
      },
      targetDate: dateOnly(plan.targetDate),
      startedAt: plan.startedAt,
      completedAt: plan.completedAt,
      createdAt: plan.createdAt,
    };
  }

  async list(query: TransferListQueryDto) {
    const where = {
      status: query.status,
      knowledgeAreaId: query.knowledgeAreaId,
    } satisfies Prisma.KnowledgeTransferPlanWhereInput;
    const [plans, total] = await Promise.all([
      this.prisma.knowledgeTransferPlan.findMany({
        where,
        select: planSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.prisma.knowledgeTransferPlan.count({ where }),
    ]);
    const asOf = this.clock();
    const evidence = await this.evidenceFor(
      this.prisma,
      [...new Set(plans.map((plan) => plan.knowledgeArea.id))],
      asOf,
    );
    const data = plans.map((plan) =>
      this.summary(
        plan,
        this.assess(
          plan.knowledgeArea,
          evidence.get(plan.knowledgeArea.id) ?? [],
          plan,
          asOf,
        ),
      ),
    );
    return { asOf, ...paginate(data, total, query) };
  }

  async get(id: string) {
    const plan = await this.prisma.knowledgeTransferPlan.findUnique({
      where: { id },
      select: {
        ...planSelect,
        activities: {
          select: {
            id: true,
            type: true,
            title: true,
            description: true,
            status: true,
            weight: true,
            completedAt: true,
            createdAt: true,
            evidence: { select: { id: true, type: true, occurredAt: true } },
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        },
        checkpoints: {
          select: {
            id: true,
            activityId: true,
            capturedAt: true,
            backupScore: true,
            primaryHolderScore: true,
            effectiveExpertCount: true,
            riskScore: true,
            riskLevel: true,
            formulaVersion: true,
            mappingVersion: true,
          },
          orderBy: [{ capturedAt: "asc" }, { id: "asc" }],
        },
      },
    });
    if (!plan) throw new NotFoundException("Transfer plan not found");
    const asOf = this.clock();
    const evidence = await this.evidenceFor(
      this.prisma,
      [plan.knowledgeArea.id],
      asOf,
    );
    const live = this.assess(
      plan.knowledgeArea,
      evidence.get(plan.knowledgeArea.id) ?? [],
      plan,
      asOf,
    );
    return {
      data: {
        ...this.summary(plan, live),
        activities: plan.activities,
        checkpoints: plan.checkpoints.map((checkpoint) => ({
          ...checkpoint,
          riskScore: oneDecimal(checkpoint.riskScore),
        })),
        recommendations: recommendActivities(live.backupScore),
        mappingVersion: TRANSFER_MAPPING_VERSION,
        asOf,
      },
    };
  }

  private targetDate(value: string, now: Date) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || dateOnly(date) !== value)
      throw new BadRequestException("targetDate must be a valid date");
    const today = Date.parse(`${dateOnly(now)}T00:00:00.000Z`);
    if (date.getTime() < today)
      throw new BadRequestException("Target date must not be in the past");
    if (date.getTime() > today + MAX_TARGET_DAYS * DAY_IN_MS)
      throw new BadRequestException(
        "Target date must be within two years from today",
      );
    return date;
  }

  async create(input: CreateTransferDto, createdById: string) {
    if (input.primaryHolderId === input.backupEmployeeId)
      throw new BadRequestException(
        "The primary holder and the backup must be different people",
      );
    const now = this.clock();
    const targetDate = this.targetDate(input.targetDate, now);
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id: input.knowledgeAreaId },
      select: areaSelect,
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const people = await this.prisma.employee.findMany({
      where: { id: { in: [input.primaryHolderId, input.backupEmployeeId] } },
      select: { id: true, status: true },
    });
    for (const id of [input.primaryHolderId, input.backupEmployeeId]) {
      const found = people.find((candidate) => candidate.id === id);
      if (!found) throw new NotFoundException("Person not found");
      if (found.status !== "ACTIVE")
        throw new BadRequestException("Both people must be active");
    }
    const evidence = await this.evidenceFor(this.prisma, [area.id], now);
    const baseline = this.assess(area, evidence.get(area.id) ?? [], input, now);
    if (!isMeaningfulExpertise(baseline.primaryHolderRawScore))
      throw new BadRequestException(
        "The primary holder has no recorded expertise in this knowledge area",
      );
    const targetCoverage = input.targetCoverage ?? DEFAULT_TARGET_COVERAGE;
    if (targetCoverage <= baseline.backupScore)
      throw new BadRequestException(
        "Target coverage must be above the backup's current coverage",
      );

    const id = await this.prisma.$transaction(async (tx) => {
      // Serializes creates for one area and backup so only one plan stays open.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`transfer:${area.id}:${input.backupEmployeeId}`}))`;
      const open = await tx.knowledgeTransferPlan.findFirst({
        where: {
          knowledgeAreaId: area.id,
          backupEmployeeId: input.backupEmployeeId,
          status: { not: "COMPLETED" },
        },
        select: { id: true },
      });
      if (open)
        throw new ConflictException(
          "An open transfer plan already exists for this backup and knowledge area",
        );
      const plan = await tx.knowledgeTransferPlan.create({
        data: {
          knowledgeAreaId: area.id,
          primaryHolderId: input.primaryHolderId,
          backupEmployeeId: input.backupEmployeeId,
          targetCoverage,
          baselineCoverage: baseline.backupScore,
          targetDate,
          createdById,
        },
        select: { id: true },
      });
      await tx.transferCheckpoint.create({
        data: this.checkpointData(plan.id, null, now, baseline),
      });
      return plan.id;
    });
    return this.get(id);
  }

  private checkpointData(
    transferPlanId: string,
    activityId: string | null,
    capturedAt: Date,
    assessment: ReturnType<typeof assessArea>,
  ) {
    return {
      transferPlanId,
      activityId,
      capturedAt,
      backupScore: assessment.backupScore,
      primaryHolderScore: assessment.primaryHolderScore,
      effectiveExpertCount: assessment.effectiveExpertCount,
      riskScore: assessment.riskScore,
      riskLevel: assessment.riskLevel,
      formulaVersion: assessment.formulaVersion,
      mappingVersion: TRANSFER_MAPPING_VERSION,
    };
  }

  private async plan(id: string) {
    const plan = await this.prisma.knowledgeTransferPlan.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startedAt: true,
        primaryHolderId: true,
        backupEmployeeId: true,
        knowledgeArea: { select: areaSelect },
        _count: { select: { activities: true } },
      },
    });
    if (!plan) throw new NotFoundException("Transfer plan not found");
    return plan;
  }

  async update(id: string, input: UpdateTransferDto) {
    if (input.status === undefined && input.targetDate === undefined)
      throw new BadRequestException("Provide a status or a target date");
    const plan = await this.plan(id);
    if (plan.status === "COMPLETED")
      throw new ConflictException("A completed plan cannot change");
    const now = this.clock();
    const data: Prisma.KnowledgeTransferPlanUpdateManyMutationInput = {};
    if (input.targetDate !== undefined)
      data.targetDate = this.targetDate(input.targetDate, now);
    if (input.status !== undefined && input.status !== plan.status) {
      if (!canTransition(plan.status, input.status))
        throw new ConflictException(
          `A plan cannot move from ${plan.status} to ${input.status}`,
        );
      data.status = input.status;
      if (input.status === "IN_PROGRESS" && !plan.startedAt)
        data.startedAt = now;
      if (input.status === "COMPLETED") data.completedAt = now;
    }
    const { count } = await this.prisma.knowledgeTransferPlan.updateMany({
      where: { id, status: plan.status },
      data,
    });
    if (count !== 1)
      throw new ConflictException("The plan changed; reload and try again");
    return this.get(id);
  }

  private assertOpenForActivities(status: TransferPlanStatus) {
    if (status === "BLOCKED" || status === "COMPLETED")
      throw new ConflictException(
        "Activities can change only on planned or in-progress plans",
      );
  }

  async addActivity(id: string, input: CreateActivityDto) {
    const plan = await this.plan(id);
    this.assertOpenForActivities(plan.status);
    if (plan._count.activities >= MAX_ACTIVITIES)
      throw new BadRequestException(
        `A plan can have at most ${MAX_ACTIVITIES} activities`,
      );
    await this.prisma.transferActivity.create({
      data: {
        transferPlanId: id,
        type: input.type,
        title: input.title,
        description: input.description || null,
        weight: input.weight ?? 1,
      },
    });
    return this.get(id);
  }

  async completeActivity(id: string, activityId: string) {
    const plan = await this.plan(id);
    const activity = await this.prisma.transferActivity.findFirst({
      where: { id: activityId, transferPlanId: id },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        status: true,
        weight: true,
      },
    });
    if (!activity) throw new NotFoundException("Transfer activity not found");
    this.assertOpenForActivities(plan.status);
    if (activity.status === "COMPLETED")
      throw new ConflictException("This activity is already completed");

    await this.prisma.$transaction(async (tx) => {
      const now = this.clock();
      const evidence = await tx.evidence.create({
        data: {
          employeeId: plan.backupEmployeeId,
          knowledgeAreaId: plan.knowledgeArea.id,
          type: ACTIVITY_EVIDENCE_TYPE[activity.type],
          title: activity.title,
          description: activity.description,
          source: TRANSFER_EVIDENCE_SOURCE,
          sourceReference: activity.id,
          strength: activity.weight,
          occurredAt: now,
          metadata: {
            transferPlanId: plan.id,
            transferActivityId: activity.id,
            activityType: activity.type,
            mappingVersion: TRANSFER_MAPPING_VERSION,
          },
        },
        select: { id: true },
      });
      // The status guard makes a concurrent second completion roll back.
      const { count } = await tx.transferActivity.updateMany({
        where: { id: activity.id, status: "PLANNED" },
        data: {
          status: "COMPLETED",
          completedAt: now,
          evidenceId: evidence.id,
        },
      });
      if (count !== 1)
        throw new ConflictException("This activity is already completed");
      const started = await tx.knowledgeTransferPlan.updateMany({
        where: { id: plan.id, status: { in: ["PLANNED", "IN_PROGRESS"] } },
        data: {
          status: "IN_PROGRESS",
          ...(plan.startedAt ? {} : { startedAt: now }),
        },
      });
      if (started.count !== 1)
        throw new ConflictException("The plan changed; reload and try again");
      const rows = await this.evidenceFor(tx, [plan.knowledgeArea.id], now);
      await tx.transferCheckpoint.create({
        data: this.checkpointData(
          plan.id,
          activity.id,
          now,
          this.assess(
            plan.knowledgeArea,
            rows.get(plan.knowledgeArea.id) ?? [],
            plan,
            now,
          ),
        ),
      });
    });
    return this.get(id);
  }

  async statusSummary() {
    const groups = await this.prisma.knowledgeTransferPlan.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const totals = Object.fromEntries(
      TRANSFER_STATUSES.map((status) => [
        status,
        groups.find((group) => group.status === status)?._count._all ?? 0,
      ]),
    ) as Record<TransferPlanStatus, number>;
    return {
      totals,
      active: totals.PLANNED + totals.IN_PROGRESS + totals.BLOCKED,
    };
  }

  async candidates(knowledgeAreaId: string) {
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id: knowledgeAreaId },
      select: areaSelect,
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const asOf = this.clock();
    const evidence =
      (await this.evidenceFor(this.prisma, [area.id], asOf)).get(area.id) ?? [];
    const holderIds = [...new Set(evidence.map((row) => row.employeeId))];
    const [people, openPlans] = await Promise.all([
      this.prisma.employee.findMany({
        where: {
          status: "ACTIVE",
          OR: [{ departmentId: area.department.id }, { id: { in: holderIds } }],
        },
        select: personSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.prisma.knowledgeTransferPlan.findMany({
        where: { knowledgeAreaId: area.id, status: { not: "COMPLETED" } },
        select: { id: true, backupEmployeeId: true },
      }),
    ]);
    const scoreOf = (employeeId: string) =>
      scoreExpertise(
        evidence.filter((row) => row.employeeId === employeeId),
        { asOf, knowledgeDecayRate: area.knowledgeDecayRate },
      ).expertiseScore;
    const candidates = people.map((employee) => ({
      employee: person(employee),
      expertiseScore: scoreOf(employee.id),
      openPlanId:
        openPlans.find((plan) => plan.backupEmployeeId === employee.id)?.id ??
        null,
    }));
    return {
      data: {
        knowledgeArea: {
          id: area.id,
          name: area.name,
          department: area.department,
          businessCriticality: area.businessCriticality,
        },
        holders: candidates
          .filter(({ expertiseScore }) => expertiseScore > 0)
          .sort(
            (a, b) =>
              b.expertiseScore - a.expertiseScore ||
              a.employee.name.localeCompare(b.employee.name) ||
              a.employee.id.localeCompare(b.employee.id),
          ),
        candidates,
        asOf,
      },
    };
  }
}
