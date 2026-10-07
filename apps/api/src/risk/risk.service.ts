import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { paginate } from "../common/pagination";
import { departmentReference } from "../common/references";
import { PrismaService } from "../database/prisma.service";
import { effectiveExpertCount } from "../expertise/concentration";
import { isMeaningfulExpertise, scoreExpertise } from "../expertise/scoring";
import { calculateRisk, RISK_FORMULA_VERSION, type RiskLevel } from "./risk";

const areaSelect = {
  id: true,
  name: true,
  businessCriticality: true,
  knowledgeDecayRate: true,
  department: departmentReference,
} satisfies Prisma.KnowledgeAreaSelect;
type Area = Prisma.KnowledgeAreaGetPayload<{ select: typeof areaSelect }>;
const evidenceSelect = {
  knowledgeAreaId: true,
  employeeId: true,
  type: true,
  strength: true,
  occurredAt: true,
} satisfies Prisma.EvidenceSelect;
type EvidenceRow = Prisma.EvidenceGetPayload<{ select: typeof evidenceSelect }>;
type RiskQuery = { asOf?: Date | string };
type PageQuery = RiskQuery & { page: number; pageSize: number };
const scoreDisplay = (score: number) => Number(score.toFixed(1));

@Injectable()
export class RiskService {
  constructor(private readonly prisma: PrismaService) {}

  private async calculate(areas: Area[], asOf: Date) {
    const rows = areas.length
      ? await this.prisma.evidence.findMany({
          where: {
            knowledgeAreaId: { in: areas.map(({ id }) => id) },
            occurredAt: { lte: asOf },
          },
          select: evidenceSelect,
        })
      : [];
    const byArea = new Map<string, EvidenceRow[]>();
    for (const row of rows) {
      const group = byArea.get(row.knowledgeAreaId) ?? [];
      group.push(row);
      byArea.set(row.knowledgeAreaId, group);
    }
    return areas.map((area) => {
      const evidence = byArea.get(area.id) ?? [];
      const byPerson = new Map<string, EvidenceRow[]>();
      for (const row of evidence) {
        const group = byPerson.get(row.employeeId) ?? [];
        group.push(row);
        byPerson.set(row.employeeId, group);
      }
      const scores = [...byPerson.values()]
        .map(
          (group) =>
            scoreExpertise(group, {
              asOf,
              knowledgeDecayRate: area.knowledgeDecayRate,
            }).rawScore,
        )
        .filter(isMeaningfulExpertise);
      const expertCount = effectiveExpertCount(scores);
      const risk = calculateRisk({
        asOf,
        businessCriticality: area.businessCriticality,
        effectiveExpertCount: expertCount,
        evidence,
      });
      return {
        knowledgeArea: {
          id: area.id,
          name: area.name,
          department: area.department,
          businessCriticality: area.businessCriticality,
        },
        effectiveExpertCount: expertCount,
        ...risk,
        riskScore: scoreDisplay(risk.riskScore),
        rawRiskScore: risk.riskScore,
      };
    });
  }

  private date(query: RiskQuery) {
    return query.asOf ? new Date(query.asOf) : new Date();
  }
  private async all(asOf: Date) {
    const areas = await this.prisma.knowledgeArea.findMany({
      select: areaSelect,
    });
    return this.calculate(areas, asOf);
  }
  async forKnowledge(id: string, query: RiskQuery) {
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: areaSelect,
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const [risk] = await this.calculate([area], this.date(query));
    if (!risk) throw new NotFoundException("Knowledge area not found");
    const { rawRiskScore: _raw, ...data } = risk;
    void _raw;
    return { data };
  }
  async distribution(query: RiskQuery) {
    const asOf = this.date(query);
    const totals = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    for (const risk of await this.all(asOf)) totals[risk.riskLevel]++;
    return { asOf, totals };
  }
  async overview(query: RiskQuery) {
    const asOf = this.date(query);
    const risks = await this.all(asOf);
    return {
      asOf,
      totalKnowledgeAreas: risks.length,
      criticalKnowledgeAreas: risks.filter(
        ({ riskLevel }) => riskLevel === "CRITICAL",
      ).length,
      atRiskKnowledgeAreas: risks.filter(
        ({ riskLevel }) => riskLevel === "HIGH" || riskLevel === "CRITICAL",
      ).length,
      averageEffectiveExpertCount: risks.length
        ? scoreDisplay(
            risks.reduce((sum, risk) => sum + risk.effectiveExpertCount, 0) /
              risks.length,
          )
        : 0,
    };
  }
  async departments(query: RiskQuery & Partial<PageQuery>) {
    const asOf = this.date(query);
    const groups = new Map<
      string,
      {
        department: Area["department"];
        total: number;
        knowledgeAreaCount: number;
      }
    >();
    for (const risk of await this.all(asOf)) {
      const department = risk.knowledgeArea.department;
      const group = groups.get(department.id) ?? {
        department,
        total: 0,
        knowledgeAreaCount: 0,
      };
      group.total += risk.rawRiskScore;
      group.knowledgeAreaCount++;
      groups.set(department.id, group);
    }
    const data = [...groups.values()]
      .map(({ department, total, knowledgeAreaCount }) => {
        const average = total / knowledgeAreaCount;
        const riskLevel: RiskLevel =
          average < 10
            ? "LOW"
            : average < 30
              ? "MEDIUM"
              : average < 45
                ? "HIGH"
                : "CRITICAL";
        return {
          department,
          riskScore: scoreDisplay(average),
          riskLevel,
          knowledgeAreaCount,
        };
      })
      .sort(
        (a, b) =>
          b.riskScore - a.riskScore ||
          a.department.name.localeCompare(b.department.name) ||
          a.department.id.localeCompare(b.department.id),
      );
    const paging = { page: query.page ?? 1, pageSize: query.pageSize ?? 20 };
    return {
      asOf,
      ...paginate(
        data.slice(
          (paging.page - 1) * paging.pageSize,
          paging.page * paging.pageSize,
        ),
        data.length,
        paging,
      ),
    };
  }
  async highRisk(query: PageQuery) {
    const asOf = this.date(query);
    const risks = (await this.all(asOf)).sort(
      (a, b) =>
        b.rawRiskScore - a.rawRiskScore ||
        a.knowledgeArea.name.localeCompare(b.knowledgeArea.name) ||
        a.knowledgeArea.id.localeCompare(b.knowledgeArea.id),
    );
    const data = risks
      .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
      .map(({ knowledgeArea, effectiveExpertCount, riskScore, riskLevel }) => ({
        knowledgeArea,
        effectiveExpertCount,
        riskScore,
        riskLevel,
      }));
    return { asOf, ...paginate(data, risks.length, query) };
  }
  async capture(id: string) {
    const asOf = new Date();
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: areaSelect,
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const [risk] = await this.calculate([area], asOf);
    if (!risk) throw new NotFoundException("Knowledge area not found");
    const snapshotDate = new Date(
      Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()),
    );
    return this.prisma.knowledgeRiskSnapshot.upsert({
      where: {
        knowledgeAreaId_snapshotDate_formulaVersion: {
          knowledgeAreaId: id,
          snapshotDate,
          formulaVersion: RISK_FORMULA_VERSION,
        },
      },
      update: {},
      create: {
        knowledgeAreaId: id,
        snapshotDate,
        asOf,
        formulaVersion: RISK_FORMULA_VERSION,
        riskScore: risk.rawRiskScore,
        riskLevel: risk.riskLevel,
        businessCriticality: risk.factors.businessCriticality,
        effectiveExpertCount: risk.effectiveExpertCount,
        evidenceCount: risk.evidenceCount,
        latestEvidenceAgeDays: risk.latestEvidenceAgeDays,
        latestDocumentationAgeDays: risk.latestDocumentationAgeDays,
        factors: risk.factors,
      },
    });
  }
  async history(id: string, query: { page: number; pageSize: number }) {
    const area = await this.prisma.knowledgeArea.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!area) throw new NotFoundException("Knowledge area not found");
    const [data, total] = await Promise.all([
      this.prisma.knowledgeRiskSnapshot.findMany({
        where: { knowledgeAreaId: id },
        orderBy: [
          { snapshotDate: "desc" },
          { formulaVersion: "asc" },
          { id: "asc" },
        ],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.knowledgeRiskSnapshot.count({
        where: { knowledgeAreaId: id },
      }),
    ]);
    return paginate(data, total, query);
  }
}
