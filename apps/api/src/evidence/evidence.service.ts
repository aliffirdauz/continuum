import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { paginate, toSkipTake, type Paginated } from "../common/pagination";
import {
  employeeReference,
  knowledgeAreaReference,
} from "../common/references";
import { PrismaService } from "../database/prisma.service";
import type { EvidenceQueryDto } from "./dto/evidence-query.dto";

const evidenceSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  source: true,
  sourceReference: true,
  strength: true,
  occurredAt: true,
  employee: employeeReference,
  knowledgeArea: knowledgeAreaReference,
} satisfies Prisma.EvidenceSelect;

export type EvidenceItem = Prisma.EvidenceGetPayload<{
  select: typeof evidenceSelect;
}>;

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EvidenceQueryDto): Promise<Paginated<EvidenceItem>> {
    const where: Prisma.EvidenceWhereInput = {
      employeeId: query.employeeId,
      knowledgeAreaId: query.knowledgeAreaId,
      type: query.type,
    };
    const [evidence, total] = await this.prisma.$transaction([
      this.prisma.evidence.findMany({
        where,
        select: evidenceSelect,
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        ...toSkipTake(query),
      }),
      this.prisma.evidence.count({ where }),
    ]);

    return paginate(evidence, total, query);
  }

  async findOne(id: string): Promise<EvidenceItem> {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      select: evidenceSelect,
    });

    if (!evidence) {
      throw new NotFoundException("Evidence not found");
    }

    return evidence;
  }
}
