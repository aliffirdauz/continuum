// Shared Prisma selections for compact links to related records.
export const departmentReference = {
  select: { id: true, name: true },
} as const;

export const employeeReference = {
  select: { id: true, name: true, jobTitle: true },
} as const;

export const knowledgeAreaReference = {
  select: { id: true, name: true },
} as const;
