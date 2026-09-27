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
