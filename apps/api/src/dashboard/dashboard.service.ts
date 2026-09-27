import { Injectable } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service";

// Business criticality at or above this value is summarized as high. This is an
// inventory view of stored criticality, not a calculated knowledge risk.
export const HIGH_CRITICALITY_THRESHOLD = 0.8;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      departments,
      employees,
      knowledgeAreas,
      highCriticalityKnowledgeAreas,
      businessObjects,
      evidence,
      latestEvidence,
    ] = await this.prisma.$transaction([
      this.prisma.department.count(),
      this.prisma.employee.count(),
      this.prisma.knowledgeArea.count(),
      this.prisma.knowledgeArea.count({
        where: { businessCriticality: { gte: HIGH_CRITICALITY_THRESHOLD } },
      }),
      this.prisma.businessObject.count(),
      this.prisma.evidence.count(),
      this.prisma.evidence.aggregate({ _max: { occurredAt: true } }),
    ]);

    return {
      totals: {
        departments,
        employees,
        knowledgeAreas,
        businessObjects,
        evidence,
      },
      highCriticalityThreshold: HIGH_CRITICALITY_THRESHOLD,
      highCriticalityKnowledgeAreas,
      latestEvidenceAt: latestEvidence._max.occurredAt,
    };
  }
}
