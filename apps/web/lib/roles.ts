export const roleLabels = {
  EMPLOYEE: "Employee",
  MANAGER: "Department manager",
  KNOWLEDGE_ADMIN: "Knowledge administrator",
} as const;

export type UserRole = keyof typeof roleLabels;
