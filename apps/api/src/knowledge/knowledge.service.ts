import { Injectable, NotFoundException } from "@nestjs/common";
import type { EvidenceType, Prisma } from "@prisma/client";

import { paginate, toSkipTake } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import { emptyRollup, rollUpEvidence } from "../evidence/evidence-rollup";
import { effectiveExpertCount } from "../expertise/concentration";
import { isMeaningfulExpertise, scoreExpertise } from "../expertise/scoring";
import type { KnowledgeQueryDto } from "./dto/knowledge-query.dto";
import { buildKnowledgeOrderBy, buildKnowledgeWhere } from "./knowledge-query";

const knowledgeAreaSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  status: true,
  businessCriticality: true,
  knowledgeDecayRate: true,
  department: departmentReference,
  _count: { select: { businessObjects: true } },
} satisfies Prisma.KnowledgeAreaSelect;

type KnowledgeAreaRecord = Prisma.KnowledgeAreaGetPayload<{
  select: typeof knowledgeAreaSelect;
}>;

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: KnowledgeQueryDto) {
    const where = buildKnowledgeWhere(query);
    const [areas, total] = await this.prisma.$transaction([
      this.prisma.knowledgeArea.findMany({
        where,
        select: knowledgeAreaSelect,
        orderBy: buildKnowledgeOrderBy(query),
        ...toSkipTake(query),
      }),
      this.prisma.knowledgeArea.count({ where }),
    ]);
    const activity = await this.contributionsByArea(areas.map(({ id }) => id));
    const asOf = new Date();
    const evidence = areas.length
      ? await this.prisma.evidence.findMany({
          where: {
            knowledgeAreaId: { in: areas.map(({ id }) => id) },
            occurredAt: { lte: asOf },
          },
          select: {
            knowledgeAreaId: true,
            employeeId: true,
            type: true,
            strength: true,
            occurredAt: true,
          },
        })
      : [];
    const grouped = new Map<string, typeof evidence>();
    for (const row of evidence) {
      const key = `${row.knowledgeAreaId}:${row.employeeId}`;
      const group = grouped.get(key) ?? [];
      group.push(row);
      grouped.set(key, group);
    }
    const countByArea = new Map<string, number[]>();
    const decayById = new Map(
      areas.map(({ id, knowledgeDecayRate }) => [id, knowledgeDecayRate]),
    );
    for (const group of grouped.values()) {
      const areaId = group[0]!.knowledgeAreaId;
      const score = scoreExpertise(group, {
        asOf,
        knowledgeDecayRate: decayById.get(areaId)!,
      });
      if (isMeaningfulExpertise(score.rawScore)) {
        const scores = countByArea.get(areaId) ?? [];
        scores.push(score.rawScore);
        countByArea.set(areaId, scores);
      }
    }

    return paginate(
      areas.map((area) => ({
        ...toSummary(area, activity.get(area.id)),
        effectiveExpertCount: effectiveExpertCount(
          countByArea.get(area.id) ?? [],
        ),
      })),
      total,
      query,
    );
  }

  async categories(): Promise<{ data: string[] }> {
    const rows = await this.prisma.knowledgeArea.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });

    return { data: rows.map(({ category }) => category) };
  }

  async findOne(id: string) {
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: {
        ...knowledgeAreaSelect,
        createdAt: true,
        updatedAt: true,
        businessObjects: {
          select: {
            impactWeight: true,
            businessObject: {
              select: {
                id: true,
                name: true,
                type: true,
                criticality: true,
                department: departmentReference,
              },
            },
          },
          orderBy: [
            { impactWeight: "desc" },
            { businessObject: { name: "asc" } },
          ],
        },
      },
    });

    if (!area) {
      throw new NotFoundException("Knowledge area not found");
    }

    const groups = await this.prisma.evidence.groupBy({
      by: ["employeeId", "type"],
      where: { knowledgeAreaId: id },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    const byEmployee = rollUpEvidence<EvidenceType>(
      groups.map((group) => ({
        key: group.employeeId,
        subKey: group.type,
        count: group._count._all,
        lastOccurredAt: group._max.occurredAt,
      })),
    );
    const byType = rollUpEvidence<EvidenceType>(
      groups.map((group) => ({
        key: id,
        subKey: group.type,
        count: group._count._all,
        lastOccurredAt: group._max.occurredAt,
      })),
    ).get(id);
    const people = await this.prisma.employee.findMany({
      where: { id: { in: [...byEmployee.keys()] } },
      select: {
        id: true,
        name: true,
        jobTitle: true,
        status: true,
        department: departmentReference,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return {
      ...toSummary(area, {
        evidenceCount: byType?.evidenceCount ?? 0,
        lastEvidenceAt: byType?.lastEvidenceAt ?? null,
        contributorCount: byEmployee.size,
      }),
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
      evidenceByType: (byType?.breakdown ?? []).map(({ key, count }) => ({
        type: key,
        count,
      })),
      businessObjects: area.businessObjects.map(
        ({ impactWeight, businessObject }) => ({
          ...businessObject,
          impactWeight,
        }),
      ),
      contributors: people.map((person) => {
        const rollup = byEmployee.get(person.id) ?? emptyRollup;

        return {
          ...person,
          evidenceCount: rollup.evidenceCount,
          lastEvidenceAt: rollup.lastEvidenceAt,
          evidenceTypes: rollup.breakdown.map(({ key }) => key),
        };
      }),
    };
  }

  async assertExists(id: string): Promise<void> {
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!area) {
      throw new NotFoundException("Knowledge area not found");
    }
  }

  private async contributionsByArea(ids: string[]) {
    const groups = await this.prisma.evidence.groupBy({
      by: ["knowledgeAreaId", "employeeId"],
      where: { knowledgeAreaId: { in: ids } },
      _count: { _all: true },
      _max: { occurredAt: true },
    });
    const rollups = rollUpEvidence(
      groups.map((group) => ({
        key: group.knowledgeAreaId,
        subKey: group.employeeId,
        count: group._count._all,
        lastOccurredAt: group._max.occurredAt,
      })),
    );

    return new Map(
      [...rollups].map(([areaId, rollup]) => [
        areaId,
        {
          evidenceCount: rollup.evidenceCount,
          lastEvidenceAt: rollup.lastEvidenceAt,
          contributorCount: rollup.breakdown.length,
        },
      ]),
    );
  }
}

interface AreaActivity {
  evidenceCount: number;
  lastEvidenceAt: Date | null;
  contributorCount: number;
}

function toSummary(
  { _count, ...area }: KnowledgeAreaRecord,
  activity: AreaActivity = {
    evidenceCount: 0,
    lastEvidenceAt: null,
    contributorCount: 0,
  },
) {
  return {
    ...area,
    businessObjectCount: _count.businessObjects,
    ...activity,
  };
}
