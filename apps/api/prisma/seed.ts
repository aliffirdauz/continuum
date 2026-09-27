import "dotenv/config";

import { hash } from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const demoUsers = [
  {
    id: "usr_northstar_employee",
    email: "employee@northstar.demo",
    name: "Maya Putri",
    role: Role.EMPLOYEE,
  },
  {
    id: "usr_northstar_manager",
    email: "manager@northstar.demo",
    name: "Budi Santoso",
    role: Role.MANAGER,
  },
  {
    id: "usr_northstar_admin",
    email: "admin@northstar.demo",
    name: "Ayu Rahman",
    role: Role.KNOWLEDGE_ADMIN,
  },
] as const;

async function seed() {
  const password = process.env.DEMO_USER_PASSWORD;

  if (!password || password.length < 12) {
    throw new Error("DEMO_USER_PASSWORD must contain at least 12 characters");
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction(
    demoUsers.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        create: { ...user, passwordHash },
        update: {
          name: user.name,
          passwordHash,
          role: user.role,
          status: "ACTIVE",
        },
      }),
    ),
  );

  console.info(`Seeded ${demoUsers.length} demo authentication accounts.`);
}

async function main(): Promise<void> {
  try {
    await seed();
  } catch (error: unknown) {
    console.error("Seed failed", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
