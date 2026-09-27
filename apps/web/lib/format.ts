import type {
  BusinessObjectType,
  EmployeeStatus,
  EvidenceType,
} from "./api-types";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatMonth(value: string): string {
  return monthFormatter.format(new Date(value));
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const evidenceTypeLabels: Record<EvidenceType, string> = {
  DOCUMENT_AUTHORED: "Document authored",
  DOCUMENT_CONTRIBUTION: "Document contribution",
  PROJECT_PARTICIPATION: "Project participation",
  TICKET_RESOLVED: "Ticket resolved",
  INCIDENT_RESOLVED: "Incident resolved",
  CODE_CONTRIBUTION: "Code contribution",
  CODE_REVIEW: "Code review",
  TRAINING_COMPLETED: "Training completed",
  PEER_CONFIRMATION: "Peer confirmation",
  PROCESS_EXECUTION: "Process execution",
  MAINTENANCE_ACTIVITY: "Maintenance activity",
};

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
};

export const businessObjectTypeLabels: Record<BusinessObjectType, string> = {
  SERVICE: "Service",
  PROCESS: "Process",
  PRODUCT: "Product",
  PROJECT: "Project",
  MACHINE: "Machine",
  ASSET: "Asset",
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
  REGULATION: "Regulation",
  SYSTEM: "System",
};
