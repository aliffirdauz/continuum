import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type { Prisma, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service";
import { RISK_FORMULA_VERSION } from "../risk/risk";
import {
  compareArea,
  COVERAGE_FORMULA_VERSION,
  COVERAGE_DENOMINATOR,
} from "./simulation";
import type {
  CreateSimulationDto,
  SimulationQueryDto,
} from "./simulations.dto";

const MAX_AREAS = 500;
const MAX_OBJECTS = 500;
const departmentSelect = { id: true, name: true } as const;
const areaSelect = {
  id: true,
  name: true,
  businessCriticality: true,
  knowledgeDecayRate: true,
  department: { select: departmentSelect },
  businessObjects: {
    select: {
      impactWeight: true,
      businessObject: {
        select: { id: true, name: true, type: true, criticality: true },
      },
    },
  },
} satisfies Prisma.KnowledgeAreaSelect;
const evidenceSelect = {
  knowledgeAreaId: true,
  employeeId: true,
  type: true,
  strength: true,
  occurredAt: true,
} satisfies Prisma.EvidenceSelect;
type EvidenceRow = Prisma.EvidenceGetPayload<{ select: typeof evidenceSelect }>;
type Area = Prisma.KnowledgeAreaGetPayload<{ select: typeof areaSelect }>;
type Result = ReturnType<typeof buildResult>;
const round = (value: number) => Number(value.toFixed(1));

function buildResult(
  id: string,
  employee: { id: string; name: string },
  startedAt: Date,
  horizonAt: Date,
  durationDays: number,
  areas: Area[],
  evidence: EvidenceRow[],
) {
  const grouped = new Map<string, EvidenceRow[]>();
  for (const row of evidence)
    grouped.set(row.knowledgeAreaId, [
      ...(grouped.get(row.knowledgeAreaId) ?? []),
      row,
    ]);
  const results = areas
    .map((area) => {
      const comparison = compareArea({
        startedAt,
        horizonAt,
        employeeId: employee.id,
        businessCriticality: area.businessCriticality,
        knowledgeDecayRate: area.knowledgeDecayRate,
        evidence: grouped.get(area.id) ?? [],
      });
      return {
        knowledgeArea: {
          id: area.id,
          name: area.name,
          department: area.department,
        },
        ...comparison,
        riskScoreDelta: round(
          comparison.after.riskScore - comparison.before.riskScore,
        ),
        coverageDelta: round(
          comparison.after.coverage - comparison.before.coverage,
        ),
        businessObjects: area.businessObjects
          .map(({ impactWeight, businessObject }) => ({
            ...businessObject,
            impactWeight,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      };
    })
    .sort(
      (a, b) =>
        b.before.coverage -
          b.after.coverage -
          (a.before.coverage - a.after.coverage) ||
        b.riskScoreDelta - a.riskScoreDelta ||
        a.knowledgeArea.id.localeCompare(b.knowledgeArea.id),
    );
  const objects = new Map<
    string,
    {
      id: string;
      name: string;
      type: string;
      criticality: number;
      affectedAreaIds: string[];
    }
  >();
  for (const area of results)
    for (const object of area.businessObjects) {
      const entry = objects.get(object.id) ?? {
        id: object.id,
        name: object.name,
        type: object.type,
        criticality: object.criticality,
        affectedAreaIds: [],
      };
      entry.affectedAreaIds.push(area.knowledgeArea.id);
      objects.set(object.id, entry);
    }
  if (results.length > MAX_AREAS || objects.size > MAX_OBJECTS)
    throw new BadRequestException(
      "Simulation exceeds the 500 area or object limit",
    );
  const objectRows = [...objects.values()]
    .map((entry) => ({
      ...entry,
      affectedAreaIds: entry.affectedAreaIds.sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const mean = (key: "before" | "after") =>
    results.length
      ? round(
          results.reduce((sum, area) => sum + area[key].coverage, 0) /
            results.length,
        )
      : 0;
  return {
    id,
    employee,
    startedAt: startedAt.toISOString(),
    horizonAt: horizonAt.toISOString(),
    durationDays,
    formulaVersion: RISK_FORMULA_VERSION,
    coverageFormulaVersion: COVERAGE_FORMULA_VERSION,
    summary: {
      affectedAreas: results.length,
      affectedObjects: objectRows.length,
      beforeCoverage: mean("before"),
      afterCoverage: mean("after"),
      coverageUnit: "percent",
      coverageDenominator: COVERAGE_DENOMINATOR,
    },
    areas: results,
    objects: objectRows,
  };
}

function view(result: Result, query: SimulationQueryDto = {}) {
  const areas = query.departmentId
    ? result.areas.filter(
        (area) => area.knowledgeArea.department.id === query.departmentId,
      )
    : result.areas;
  const areaIds = new Set(areas.map((area) => area.knowledgeArea.id));
  const objects = result.objects.flatMap((object) => {
    const affectedAreaIds = object.affectedAreaIds.filter((id) =>
      areaIds.has(id),
    );
    return affectedAreaIds.length ? [{ ...object, affectedAreaIds }] : [];
  });
  const mean = (key: "before" | "after") =>
    areas.length
      ? round(
          areas.reduce((sum, area) => sum + area[key].coverage, 0) /
            areas.length,
        )
      : 0;
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  return {
    data: {
      ...result,
      summary: {
        ...result.summary,
        affectedAreas: areas.length,
        affectedObjects: objects.length,
        beforeCoverage: mean("before"),
        afterCoverage: mean("after"),
      },
      areas: areas.slice((page - 1) * pageSize, page * pageSize),
      objects: objects.slice((page - 1) * pageSize, page * pageSize),
    },
    meta: {
      page,
      pageSize,
      areasTotal: areas.length,
      objectsTotal: objects.length,
      areasTotalPages: Math.ceil(areas.length / pageSize),
      objectsTotalPages: Math.ceil(objects.length / pageSize),
    },
  };
}

@Injectable()
export class SimulationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject("SIMULATION_CLOCK")
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async create(
    input: CreateSimulationDto,
    createdById: string,
    query?: SimulationQueryDto,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, name: true, status: true },
    });
    if (!employee) throw new NotFoundException("Person not found");
    if (employee.status !== "ACTIVE")
      throw new BadRequestException("Person must be active");
    const startedAt = this.clock();
    const durationDays = input.durationDays ?? 30;
    const horizonAt = new Date(startedAt.getTime() + durationDays * 86_400_000);
    const areas = await this.prisma.knowledgeArea.findMany({
      where: {
        evidence: {
          some: { employeeId: employee.id, occurredAt: { lte: startedAt } },
        },
      },
      select: areaSelect,
      orderBy: { id: "asc" },
      take: MAX_AREAS + 1,
    });
    if (areas.length > MAX_AREAS)
      throw new BadRequestException("Simulation exceeds the 500 area limit");
    const evidence = areas.length
      ? await this.prisma.evidence.findMany({
          where: {
            knowledgeAreaId: { in: areas.map(({ id }) => id) },
            occurredAt: { lte: startedAt },
          },
          select: evidenceSelect,
          orderBy: { id: "asc" },
        })
      : [];
    const id = randomUUID();
    const result = buildResult(
      id,
      { id: employee.id, name: employee.name },
      startedAt,
      horizonAt,
      durationDays,
      areas,
      evidence,
    );
    // Respond from the stored row: JSONB can normalize float digits, and a
    // later GET must return exactly what this POST returned.
    const saved = await this.prisma.simulationRun.create({
      select: { result: true },
      data: {
        id,
        createdById,
        employeeId: employee.id,
        startedAt,
        horizonAt,
        durationDays,
        formulaVersion: RISK_FORMULA_VERSION,
        coverageFormulaVersion: COVERAGE_FORMULA_VERSION,
        result,
      },
    });
    return view(saved.result as unknown as Result, query);
  }

  async get(
    id: string,
    requesterId: string,
    role: Role,
    query?: SimulationQueryDto,
  ) {
    const row = await this.prisma.simulationRun.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Simulation not found");
    if (role !== "KNOWLEDGE_ADMIN" && row.createdById !== requesterId)
      throw new NotFoundException("Simulation not found");
    return view(row.result as unknown as Result, query);
  }
}
