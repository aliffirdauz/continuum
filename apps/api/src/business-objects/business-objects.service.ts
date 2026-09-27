import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { paginate, toSkipTake } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import type { BusinessObjectQueryDto } from "./dto/business-object-query.dto";

const businessObjectSelect = {
  id: true,
  name: true,
  type: true,
  criticality: true,
  metadata: true,
  department: departmentReference,
  _count: { select: { knowledgeAreas: true } },
} satisfies Prisma.BusinessObjectSelect;

type BusinessObjectRecord = Prisma.BusinessObjectGetPayload<{
  select: typeof businessObjectSelect;
}>;

function toSummary({ _count, ...businessObject }: BusinessObjectRecord) {
  return { ...businessObject, knowledgeAreaCount: _count.knowledgeAreas };
}

@Injectable()
export class BusinessObjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: BusinessObjectQueryDto) {
    const where: Prisma.BusinessObjectWhereInput = {
      departmentId: query.departmentId,
      type: query.type,
      ...(query.search && {
        name: { contains: query.search, mode: "insensitive" },
      }),
    };
    const [businessObjects, total] = await this.prisma.$transaction([
      this.prisma.businessObject.findMany({
        where,
        select: businessObjectSelect,
        orderBy: { name: "asc" },
        ...toSkipTake(query),
      }),
      this.prisma.businessObject.count({ where }),
    ]);

    return paginate(businessObjects.map(toSummary), total, query);
  }

  async findOne(id: string) {
    const businessObject = await this.prisma.businessObject.findUnique({
      where: { id },
      select: {
        ...businessObjectSelect,
        knowledgeAreas: {
          select: {
            impactWeight: true,
            knowledgeArea: {
              select: {
                id: true,
                name: true,
                category: true,
                businessCriticality: true,
                department: departmentReference,
              },
            },
          },
          orderBy: [
            { impactWeight: "desc" },
            { knowledgeArea: { name: "asc" } },
          ],
        },
      },
    });

    if (!businessObject) {
      throw new NotFoundException("Business object not found");
    }

    const { knowledgeAreas, ...record } = businessObject;

    return {
      ...toSummary(record),
      knowledgeAreas: knowledgeAreas.map(({ impactWeight, knowledgeArea }) => ({
        ...knowledgeArea,
        impactWeight,
      })),
    };
  }
}
