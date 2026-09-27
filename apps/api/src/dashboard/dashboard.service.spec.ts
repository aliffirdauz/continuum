import type { PrismaService } from "../database/prisma.service";
import {
  DashboardService,
  HIGH_CRITICALITY_THRESHOLD,
} from "./dashboard.service";

describe("DashboardService", () => {
  it("summarizes inventory totals without calculating risk", async () => {
    const knowledgeAreaCount = vi
      .fn()
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(12);
    const prisma = {
      $transaction: vi.fn((queries: Array<Promise<unknown>>) =>
        Promise.all(queries),
      ),
      department: { count: vi.fn().mockResolvedValue(6) },
      employee: { count: vi.fn().mockResolvedValue(35) },
      knowledgeArea: { count: knowledgeAreaCount },
      businessObject: { count: vi.fn().mockResolvedValue(12) },
      evidence: {
        count: vi.fn().mockResolvedValue(186),
        aggregate: vi.fn().mockResolvedValue({
          _max: { occurredAt: new Date("2026-08-29T00:00:00.000Z") },
        }),
      },
    };
    const service = new DashboardService(prisma as unknown as PrismaService);

    await expect(service.summary()).resolves.toEqual({
      totals: {
        departments: 6,
        employees: 35,
        knowledgeAreas: 25,
        businessObjects: 12,
        evidence: 186,
      },
      highCriticalityThreshold: HIGH_CRITICALITY_THRESHOLD,
      highCriticalityKnowledgeAreas: 12,
      latestEvidenceAt: new Date("2026-08-29T00:00:00.000Z"),
    });
    expect(knowledgeAreaCount).toHaveBeenLastCalledWith({
      where: { businessCriticality: { gte: HIGH_CRITICALITY_THRESHOLD } },
    });
  });
});
