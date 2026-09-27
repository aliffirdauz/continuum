import { Injectable, NotFoundException } from "@nestjs/common";
import type { EvidenceType, Prisma } from "@prisma/client";

import { paginate, toSkipTake } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import { emptyRollup, rollUpEvidence } from "../evidence/evidence-rollup";
import type { EmployeeQueryDto } from "./dto/employee-query.dto";

const employeeSelect = {
  id: true,
  name: true,
  email: true,
  jobTitle: true,
  location: true,
  status: true,
  joinedAt: true,
  avatarUrl: true,
  department: departmentReference,
} satisfies Prisma.EmployeeSelect;

export function buildEmployeeWhere({
  search,
  departmentId,
  status,
}: Pick<
  EmployeeQueryDto,
  "search" | "departmentId" | "status"
>): Prisma.EmployeeWhereInput {
  return {
    departmentId,
    status,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EmployeeQueryDto) {
    const where = buildEmployeeWhere(query);
    const [employees, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        select: employeeSelect,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.prisma.employee.count({ where }),
    ]);
    const groups = await this.prisma.evidence.groupBy({
      by: ["employeeId", "knowledgeAreaId"],
      where: { employeeId: { in: employees.map(({ id }) => id) } },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    const areasByEmployee = rollUpEvidence(
      groups.map((group) => ({
        key: group.employeeId,
        subKey: group.knowledgeAreaId,
        count: group._count._all,
        lastOccurredAt: group._max.occurredAt,
      })),
    );

    return paginate(
      employees.map((employee) => ({
        ...employee,
        knowledgeAreaCount:
          areasByEmployee.get(employee.id)?.breakdown.length ?? 0,
      })),
      total,
      query,
    );
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: employeeSelect,
    });

    if (!employee) {
      throw new NotFoundException("Person not found");
    }

    const groups = await this.prisma.evidence.groupBy({
      by: ["knowledgeAreaId", "type"],
      where: { employeeId: id },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    const byArea = rollUpEvidence<EvidenceType>(
      groups.map((group) => ({
        key: group.knowledgeAreaId,
        subKey: group.type,
        count: group._count._all,
        lastOccurredAt: group._max.occurredAt,
      })),
    );
    const areas = await this.prisma.knowledgeArea.findMany({
      where: { id: { in: [...byArea.keys()] } },
      select: {
        id: true,
        name: true,
        category: true,
        businessCriticality: true,
        department: departmentReference,
      },
      orderBy: { name: "asc" },
    });

    return {
      ...employee,
      knowledgeAreaCount: areas.length,
      knowledgeAreas: areas.map((area) => {
        const rollup = byArea.get(area.id) ?? emptyRollup;

        return {
          ...area,
          evidenceCount: rollup.evidenceCount,
          lastEvidenceAt: rollup.lastEvidenceAt,
          evidenceTypes: rollup.breakdown.map(({ key }) => key),
        };
      }),
    };
  }

  async assertExists(id: string): Promise<void> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException("Person not found");
    }
  }
}
