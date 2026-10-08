// Response shapes of the Continuum API. Dates arrive as ISO 8601 strings.

export const evidenceTypes = [
  "DOCUMENT_AUTHORED",
  "DOCUMENT_CONTRIBUTION",
  "PROJECT_PARTICIPATION",
  "TICKET_RESOLVED",
  "INCIDENT_RESOLVED",
  "CODE_CONTRIBUTION",
  "CODE_REVIEW",
  "TRAINING_COMPLETED",
  "PEER_CONFIRMATION",
  "PROCESS_EXECUTION",
  "MAINTENANCE_ACTIVITY",
] as const;

export type EvidenceType = (typeof evidenceTypes)[number];
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type KnowledgeAreaStatus = "ACTIVE" | "ARCHIVED";
export type BusinessObjectType =
  | "SERVICE"
  | "PROCESS"
  | "PRODUCT"
  | "PROJECT"
  | "MACHINE"
  | "ASSET"
  | "CUSTOMER"
  | "SUPPLIER"
  | "REGULATION"
  | "SYSTEM";

export interface Reference {
  id: string;
  name: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  totals: {
    departments: number;
    employees: number;
    knowledgeAreas: number;
    businessObjects: number;
    evidence: number;
  };
  highCriticalityThreshold: number;
  highCriticalityKnowledgeAreas: number;
  latestEvidenceAt: string | null;
}

export interface DepartmentSummary extends Reference {
  description: string;
  employeeCount: number;
  knowledgeAreaCount: number;
  businessObjectCount: number;
}

export interface KnowledgeAreaSummary extends Reference {
  description: string;
  category: string;
  status: KnowledgeAreaStatus;
  businessCriticality: number;
  knowledgeDecayRate: number;
  department: Reference;
  businessObjectCount: number;
  evidenceCount: number;
  contributorCount: number;
  effectiveExpertCount: number;
  lastEvidenceAt: string | null;
}

export interface EvidenceActivity {
  evidenceCount: number;
  lastEvidenceAt: string | null;
  evidenceTypes: EvidenceType[];
}

export interface KnowledgeAreaDetail extends KnowledgeAreaSummary {
  createdAt: string;
  updatedAt: string;
  evidenceByType: Array<{ type: EvidenceType; count: number }>;
  businessObjects: Array<
    Reference & {
      type: BusinessObjectType;
      criticality: number;
      impactWeight: number;
      department: Reference;
    }
  >;
  contributors: Array<
    Reference &
      EvidenceActivity & {
        jobTitle: string;
        status: EmployeeStatus;
        department: Reference;
      }
  >;
}

export interface EmployeeSummary extends Reference {
  email: string;
  jobTitle: string;
  location: string;
  status: EmployeeStatus;
  joinedAt: string;
  avatarUrl: string | null;
  department: Reference;
  knowledgeAreaCount: number;
}

export interface EmployeeDetail extends EmployeeSummary {
  knowledgeAreas: Array<
    Reference &
      EvidenceActivity & {
        category: string;
        businessCriticality: number;
        department: Reference;
      }
  >;
}

export interface ExpertiseContributor {
  employee: Reference & {
    jobTitle: string;
    status: EmployeeStatus;
    department: Reference;
  };
  expertiseScore: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  evidenceCount: number;
  lastEvidenceAt: string | null;
  evidenceByType: Array<{ type: EvidenceType; count: number }>;
  evidence: Array<{
    id: string;
    type: EvidenceType;
    title: string;
    occurredAt: string;
    strength: number;
    weight: number;
    recencyMultiplier: number;
    contribution: number;
  }>;
}

export interface KnowledgeExperts {
  data: {
    knowledgeArea: Pick<
      KnowledgeAreaSummary,
      | "id"
      | "name"
      | "businessCriticality"
      | "knowledgeDecayRate"
      | "department"
    >;
    effectiveExpertCount: number;
    totalExpertise: number;
    contributors: ExpertiseContributor[];
  };
  meta: Paginated<ExpertiseContributor>["meta"] & { asOf: string };
}

export interface EmployeeExpertise {
  knowledgeArea: Pick<
    KnowledgeAreaSummary,
    "id" | "name" | "businessCriticality" | "department"
  >;
  expertiseScore: number;
  confidence: ExpertiseContributor["confidence"];
  evidenceCount: number;
  lastEvidenceAt: string | null;
}

export interface ExpertSearch {
  data: Array<{
    knowledgeArea: Pick<
      KnowledgeAreaSummary,
      "id" | "name" | "department" | "businessCriticality"
    >;
    effectiveExpertCount: number;
    topContributors: ExpertiseContributor[];
  }>;
  meta: { asOf: string; query: string; total: number };
}

export const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type RiskLevel = (typeof riskLevels)[number];

export interface KnowledgeRisk {
  knowledgeArea: Pick<
    KnowledgeAreaSummary,
    "id" | "name" | "department" | "businessCriticality"
  >;
  effectiveExpertCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  weightedContributions: {
    concentration: number;
    freshness: number;
    documentationGap: number;
  };
  factors: {
    businessCriticality: number;
    concentration: number;
    freshness: number;
    documentationGap: number;
  };
  formulaVersion: string;
  evidenceCount: number;
  latestEvidenceAgeDays: number | null;
  latestDocumentationAgeDays: number | null;
  asOf: string;
}

export interface RiskDistribution {
  asOf: string;
  totals: Record<RiskLevel, number>;
}

export interface DepartmentRisk {
  department: Reference;
  riskScore: number;
  riskLevel: RiskLevel;
  knowledgeAreaCount: number;
}

export interface HighRiskKnowledge {
  knowledgeArea: KnowledgeRisk["knowledgeArea"];
  effectiveExpertCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description: string | null;
  source: string;
  sourceReference: string | null;
  strength: number;
  occurredAt: string;
  employee: Reference & { jobTitle: string };
  knowledgeArea: Reference;
}

export const transferStatuses = [
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
] as const;
export type TransferStatus = (typeof transferStatuses)[number];

export const transferActivityTypes = [
  "SHADOW_SESSION",
  "DOCUMENTATION",
  "INCIDENT_OBSERVATION",
  "KNOWLEDGE_INTERVIEW",
  "PAIR_WORK",
  "INDEPENDENT_VALIDATION",
  "REVIEW",
  "TRAINING",
] as const;
export type TransferActivityType = (typeof transferActivityTypes)[number];

export interface TransferPerson extends Reference {
  jobTitle: string;
  department: Reference;
}

export interface TransferPlanSummary {
  id: string;
  status: TransferStatus;
  knowledgeArea: Reference & {
    department: Reference;
    businessCriticality: number;
  };
  primaryHolder: TransferPerson;
  backupEmployee: TransferPerson;
  coverage: {
    baseline: number;
    current: number;
    target: number;
    progress: number;
    targetMet: boolean;
  };
  risk: {
    riskScore: number;
    riskLevel: RiskLevel;
    effectiveExpertCount: number;
    formulaVersion: string;
  };
  activities: { total: number; completed: number };
  targetDate: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface TransferActivity {
  id: string;
  type: TransferActivityType;
  title: string;
  description: string | null;
  status: "PLANNED" | "COMPLETED";
  weight: number;
  completedAt: string | null;
  createdAt: string;
  evidence: { id: string; type: EvidenceType; occurredAt: string } | null;
}

export interface TransferCheckpoint {
  id: string;
  activityId: string | null;
  capturedAt: string;
  backupScore: number;
  primaryHolderScore: number;
  effectiveExpertCount: number;
  riskScore: number;
  riskLevel: RiskLevel;
  formulaVersion: string;
  mappingVersion: string;
}

export interface TransferPlanDetail extends Omit<
  TransferPlanSummary,
  "activities"
> {
  activities: TransferActivity[];
  checkpoints: TransferCheckpoint[];
  recommendations: {
    band: "FOUNDATION" | "PRACTICE" | "VALIDATION";
    recommendations: Array<{
      activityType: TransferActivityType | null;
      label: string;
    }>;
  };
  mappingVersion: string;
  asOf: string;
}

export interface TransferCandidate {
  employee: TransferPerson;
  expertiseScore: number;
  openPlanId: string | null;
}

export interface TransferCandidates {
  knowledgeArea: Reference & {
    department: Reference;
    businessCriticality: number;
  };
  holders: TransferCandidate[];
  candidates: TransferCandidate[];
  asOf: string;
}
