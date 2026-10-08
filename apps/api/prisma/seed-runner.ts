import { hash } from "bcryptjs";
import { type PrismaClient, Role } from "@prisma/client";

import {
  buildEvidence,
  businessObjects,
  departments,
  employees,
  knowledgeAreas,
  knowledgeLinks,
} from "./seed-data/northstar";

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

async function seedDemoUsers(prisma: PrismaClient) {
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

async function seedNorthstar(prisma: PrismaClient) {
  const evidence = buildEvidence();

  // Array transactions run in order, so parents are written before their children.
  await prisma.$transaction([
    ...departments.map(({ id, ...data }) =>
      prisma.department.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      }),
    ),
    ...employees.map(({ id, ...data }) =>
      prisma.employee.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      }),
    ),
    ...knowledgeAreas.map(({ id, ...data }) =>
      prisma.knowledgeArea.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      }),
    ),
    ...businessObjects.map(({ id, ...data }) =>
      prisma.businessObject.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      }),
    ),
    ...knowledgeLinks.map(
      ({ knowledgeAreaId, businessObjectId, impactWeight }) =>
        prisma.knowledgeBusinessObject.upsert({
          where: {
            knowledgeAreaId_businessObjectId: {
              knowledgeAreaId,
              businessObjectId,
            },
          },
          create: { knowledgeAreaId, businessObjectId, impactWeight },
          update: { impactWeight },
        }),
    ),
    ...evidence.map(({ id, ...data }) =>
      prisma.evidence.upsert({
        where: { id },
        create: { id, ...data },
        update: data,
      }),
    ),
  ]);

  console.info(
    `Seeded Northstar Industries: ${departments.length} departments, ${employees.length} employees, ${knowledgeAreas.length} knowledge areas, ${businessObjects.length} business objects, ${knowledgeLinks.length} links, and ${evidence.length} evidence records.`,
  );
}

/** Upserts the demo identities and the Northstar dataset; never deletes. */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  await seedDemoUsers(prisma);
  await seedNorthstar(prisma);
}
