import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { runSeed } from "./seed-runner";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  try {
    await runSeed(prisma);
  } catch (error: unknown) {
    console.error("Seed failed", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
