import type { TransferActivityType, TransferStatus } from "./api-types";

export const transferStatusLabels: Record<TransferStatus, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  COMPLETED: "Completed",
};

export const activityTypeLabels: Record<TransferActivityType, string> = {
  SHADOW_SESSION: "Shadow session",
  DOCUMENTATION: "Documentation",
  INCIDENT_OBSERVATION: "Incident observation",
  KNOWLEDGE_INTERVIEW: "Knowledge interview",
  PAIR_WORK: "Pair work",
  INDEPENDENT_VALIDATION: "Independent validation",
  REVIEW: "Review",
  TRAINING: "Training",
};

export const recommendationBandLabels = {
  FOUNDATION: "Building foundations (coverage below 40)",
  PRACTICE: "Guided practice (coverage 40–70)",
  VALIDATION: "Independent validation (coverage above 70)",
} as const;
