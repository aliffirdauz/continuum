import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../database/prisma.service";

const departmentSelect = {
  id: true,
  name: true,
  description: true,
  _count: {
    select: { employees: true, knowledgeAreas: true, businessObjects: true },
  },
} satisfies Prisma.DepartmentSelect;

type DepartmentRecord = Prisma.DepartmentGetPayload<{
  select: typeof departmentSelect;
}>;

function toSummary({ _count, ...department }: DepartmentRecord) {
  return {
    ...department,
    employeeCount: _count.employees,
    knowledgeAreaCount: _count.knowledgeAreas,
    businessObjectCount: _count.businessObjects,
  };
}

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // Departments are a small reference list, so it is returned without pagination.
  async list() {
    const departments = await this.prisma.department.findMany({
      select: departmentSelect,
      orderBy: { name: "asc" },
    });

    return { data: departments.map(toSummary) };
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      select: departmentSelect,
    });

    if (!department) {
      throw new NotFoundException("Department not found");
    }

    return toSummary(department);
  }
}
