import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { buildEvidence } from "./seed-data/northstar";
import { runSeed } from "./seed-runner";

/**
 * Returns the demo database to the seed state. Transfer activities append
 * evidence, so a repeatable demonstration needs an explicit way back. This
 * deletes user-created records and is never part of startup.
 */
async function main(): Promise<void> {
  if (!process.argv.includes("--yes")) {
    console.error(
      "Refusing to reset: this deletes transfer plans, simulation runs, risk snapshots, and non-seed evidence. Re-run with --yes.",
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient();
  try {
    const seedEvidenceIds = buildEvidence().map(({ id }) => id);
    // Children first: activities reference evidence and plans restrict deletes.
    const [checkpoints, activities, plans, runs, snapshots, evidence] =
      await prisma.$transaction([
        prisma.transferCheckpoint.deleteMany(),
        prisma.transferActivity.deleteMany(),
        prisma.knowledgeTransferPlan.deleteMany(),
        prisma.simulationRun.deleteMany(),
        prisma.knowledgeRiskSnapshot.deleteMany(),
        prisma.evidence.deleteMany({
          where: { id: { notIn: seedEvidenceIds } },
        }),
      ]);
    console.info(
      `Deleted ${plans.count} transfer plans (${activities.count} activities, ${checkpoints.count} checkpoints), ${runs.count} simulation runs, ${snapshots.count} risk snapshots, and ${evidence.count} non-seed evidence records.`,
    );
    await runSeed(prisma);
  } catch (error: unknown) {
    console.error("Reset failed", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
