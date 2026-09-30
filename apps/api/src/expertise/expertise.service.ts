import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { paginate } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import { effectiveExpertCount } from "./concentration";
import { confidenceFor } from "./confidence";
import {
  isMeaningfulExpertise,
  scoreExpertise,
  totalExpertise,
} from "./scoring";
import type {
  ExpertisePageQueryDto,
  ExpertSearchQueryDto,
} from "./expertise-query.dto";

const areaSelect = {
  id: true,
  name: true,
  description: true,
  businessCriticality: true,
  knowledgeDecayRate: true,
  department: departmentReference,
} satisfies Prisma.KnowledgeAreaSelect;
const personSelect = {
  id: true,
  name: true,
  jobTitle: true,
  status: true,
  department: departmentReference,
} satisfies Prisma.EmployeeSelect;
const evidenceSelect = {
  id: true,
  title: true,
  type: true,
  strength: true,
  occurredAt: true,
  employeeId: true,
  knowledgeAreaId: true,
  employee: { select: personSelect },
} satisfies Prisma.EvidenceSelect;
type Area = Prisma.KnowledgeAreaGetPayload<{ select: typeof areaSelect }>;
type Evidence = Prisma.EvidenceGetPayload<{ select: typeof evidenceSelect }>;
type Contributor = ReturnType<typeof contributorFor>;

function contributorFor(
  person: Evidence["employee"],
  rows: Evidence[],
  area: Area,
  asOf: Date,
) {
  const score = scoreExpertise(rows, {
    asOf,
    knowledgeDecayRate: area.knowledgeDecayRate,
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.type, (counts.get(row.type) ?? 0) + 1);
  return {
    employee: person,
    expertiseScore: score.expertiseScore,
    confidence: confidenceFor({ ...score, asOf }),
    evidenceCount: score.evidenceCount,
    lastEvidenceAt: score.lastEvidenceAt,
    evidenceByType: [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([type, count]) => ({ type, count })),
    evidence: score.contributions.map(
      ({
        id,
        title,
        type,
        occurredAt,
        strength,
        weight,
        recencyMultiplier,
        contribution,
      }) => ({
        id,
        title: title ?? "",
        type,
        occurredAt,
        strength,
        weight,
        recencyMultiplier,
        contribution,
      }),
    ),
    rawScore: score.rawScore,
  };
}

function byScore<T extends { expertiseScore: number }>(
  a: T,
  b: T,
  nameA: string,
  nameB: string,
  idA: string,
  idB: string,
) {
  return (
    b.expertiseScore - a.expertiseScore ||
    nameA.localeCompare(nameB) ||
    idA.localeCompare(idB)
  );
}

@Injectable()
export class ExpertiseService {
  constructor(private readonly prisma: PrismaService) {}

  private async scored(areas: Area[], asOf: Date, employeeId?: string) {
    const rows = areas.length
      ? await this.prisma.evidence.findMany({
          where: {
            knowledgeAreaId: { in: areas.map(({ id }) => id) },
            occurredAt: { lte: asOf },
            ...(employeeId && { employeeId }),
          },
          select: evidenceSelect,
          orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        })
      : [];
    const groups = new Map<string, Evidence[]>();
    for (const row of rows) {
      const key = `${row.knowledgeAreaId}:${row.employeeId}`;
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    return new Map(
      areas.map((area) => {
        const contributors: Contributor[] = [];
        for (const group of groups.values()) {
          if (group[0]?.knowledgeAreaId !== area.id) continue;
          const contributor = contributorFor(
            group[0].employee,
            group,
            area,
            asOf,
          );
          if (isMeaningfulExpertise(contributor.rawScore))
            contributors.push(contributor);
        }
        contributors.sort((a, b) =>
          byScore(
            a,
            b,
            a.employee.name,
            b.employee.name,
            a.employee.id,
            b.employee.id,
          ),
        );
        return [area.id, contributors] as const;
      }),
    );
  }

  async forKnowledge(id: string, query: ExpertisePageQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: areaSelect,
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const contributors = (await this.scored([area], asOf)).get(id) ?? [];
    const { description: _description, ...context } = area;
    void _description;
    const { data, meta } = paginate(
      contributors
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        .map(({ rawScore: _rawScore, ...entry }) => {
          void _rawScore;
          return entry;
        }),
      contributors.length,
      query,
    );
    return {
      data: {
        knowledgeArea: context,
        effectiveExpertCount: effectiveExpertCount(
          contributors.map(({ rawScore }) => rawScore),
        ),
        totalExpertise: totalExpertise(
          contributors.map(({ rawScore }) => rawScore),
        ),
        contributors: data,
      },
      meta: { asOf, ...meta },
    };
  }

  async forEmployee(id: string, query: ExpertisePageQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const person = await this.prisma.employee.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!person) throw new NotFoundException("Person not found");
    const areas = await this.prisma.knowledgeArea.findMany({
      where: {
        evidence: { some: { employeeId: id, occurredAt: { lte: asOf } } },
      },
      select: areaSelect,
    });
    const scored = await this.scored(areas, asOf, id);
    const entries = areas
      .flatMap((area) => {
        const contributor = scored.get(area.id)?.[0];
        if (!contributor) return [];
        return [
          {
            knowledgeArea: {
              id: area.id,
              name: area.name,
              businessCriticality: area.businessCriticality,
              department: area.department,
            },
            expertiseScore: contributor.expertiseScore,
            confidence: contributor.confidence,
            evidenceCount: contributor.evidenceCount,
            lastEvidenceAt: contributor.lastEvidenceAt,
          },
        ];
      })
      .sort((a, b) =>
        byScore(
          a,
          b,
          a.knowledgeArea.name,
          b.knowledgeArea.name,
          a.knowledgeArea.id,
          b.knowledgeArea.id,
        ),
      );
    const page = paginate(
      entries.slice(
        (query.page - 1) * query.pageSize,
        query.page * query.pageSize,
      ),
      entries.length,
      query,
    );
    return { ...page, meta: { asOf, ...page.meta } };
  }

  async search(query: ExpertSearchQueryDto) {
    const asOf = query.asOf ? new Date(query.asOf) : new Date();
    const where: Prisma.KnowledgeAreaWhereInput = {
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
      ],
    };
    // Fetch matching names only; rank before limiting so name matches take precedence.
    const matches = await this.prisma.knowledgeArea.findMany({
      where,
      select: areaSelect,
    });
    matches.sort(
      (a, b) =>
        Number(b.name.toLowerCase().includes(query.q.toLowerCase())) -
          Number(a.name.toLowerCase().includes(query.q.toLowerCase())) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
    const areas = matches.slice(0, 5);
    const scored = await this.scored(areas, asOf);
    return {
      data: areas.map((area) => {
        const contributors = scored.get(area.id) ?? [];
        return {
          knowledgeArea: {
            id: area.id,
            name: area.name,
            department: area.department,
            businessCriticality: area.businessCriticality,
          },
          effectiveExpertCount: effectiveExpertCount(
            contributors.map(({ rawScore }) => rawScore),
          ),
          topContributors: contributors
            .slice(0, 3)
            .map(({ rawScore: _rawScore, ...entry }) => {
              void _rawScore;
              return entry;
            }),
        };
      }),
      meta: { asOf, query: query.q, total: matches.length },
    };
  }
}
