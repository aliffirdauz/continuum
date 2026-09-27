import {
  BusinessObjectType,
  EmployeeStatus,
  EvidenceType,
  type Prisma,
} from "@prisma/client";

// Evidence dates are offsets from this fixed date so every seed run writes identical rows.
export const SEED_REFERENCE_DATE = new Date("2026-09-01T00:00:00.000Z");

export interface DepartmentSeed {
  id: string;
  name: string;
  description: string;
}

export interface EmployeeSeed {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  departmentId: string;
  location: string;
  status: EmployeeStatus;
  joinedAt: Date;
}

export interface KnowledgeAreaSeed {
  id: string;
  name: string;
  description: string;
  category: string;
  departmentId: string;
  businessCriticality: number;
  knowledgeDecayRate: number;
}

export interface BusinessObjectSeed {
  id: string;
  name: string;
  type: BusinessObjectType;
  departmentId: string;
  criticality: number;
  metadata: Prisma.InputJsonObject;
}

export interface KnowledgeLinkSeed {
  knowledgeAreaId: string;
  businessObjectId: string;
  impactWeight: number;
}

type EvidenceRecord = readonly [
  employeeId: string,
  type: EvidenceType,
  title: string,
  strength: number,
  ageInDays: number,
];

interface EvidenceGroup {
  knowledgeAreaId: string;
  records: readonly EvidenceRecord[];
}

export interface EvidenceSeed {
  id: string;
  employeeId: string;
  knowledgeAreaId: string;
  type: EvidenceType;
  title: string;
  source: string;
  sourceReference: string;
  strength: number;
  occurredAt: Date;
}

export const departments: DepartmentSeed[] = [
  {
    id: "dep_engineering",
    name: "Engineering",
    description:
      "Builds and runs Northstar's digital products, billing, identity, and cloud platform.",
  },
  {
    id: "dep_manufacturing",
    name: "Manufacturing",
    description:
      "Operates the Bekasi and Karawang plants, production lines, and equipment maintenance.",
  },
  {
    id: "dep_finance",
    name: "Finance",
    description:
      "Owns accounting, the financial close, treasury, and tax compliance.",
  },
  {
    id: "dep_procurement",
    name: "Procurement",
    description:
      "Sources suppliers, manages contracts, and runs import and customs processes.",
  },
  {
    id: "dep_operations",
    name: "Operations",
    description:
      "Coordinates logistics, workplace safety, and business continuity across sites.",
  },
  {
    id: "dep_customer_support",
    name: "Customer Support",
    description:
      "Handles customer requests, refunds, warranty claims, and escalations.",
  },
];

function employee(
  id: string,
  name: string,
  jobTitle: string,
  departmentId: string,
  location: string,
  joinedAt: string,
  status: EmployeeStatus = EmployeeStatus.ACTIVE,
): EmployeeSeed {
  return {
    id,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@northstar.demo`,
    jobTitle,
    departmentId,
    location,
    status,
    joinedAt: new Date(`${joinedAt}T00:00:00.000Z`),
  };
}

const JAKARTA = "Jakarta HQ";
const BEKASI = "Bekasi Plant";

// prettier-ignore
export const employees: EmployeeSeed[] = [
  employee("emp_budi", "Budi Santoso", "Senior Maintenance Engineer", "dep_manufacturing", BEKASI, "2011-03-14"),
  employee("emp_andri", "Andri Pratama", "Maintenance Engineer", "dep_manufacturing", BEKASI, "2021-08-02"),
  employee("emp_joko", "Joko Susilo", "Production Supervisor", "dep_manufacturing", BEKASI, "2015-06-01"),
  employee("emp_wahyu", "Wahyu Hidayat", "Maintenance Technician", "dep_manufacturing", BEKASI, "2023-02-13"),
  employee("emp_siti", "Siti Rahayu", "Quality Control Engineer", "dep_manufacturing", BEKASI, "2018-09-10"),
  employee("emp_bambang", "Bambang Kurniawan", "Plant Manager", "dep_manufacturing", BEKASI, "2009-01-05"),
  employee("emp_eko", "Eko Prasetyo", "Process Engineer", "dep_manufacturing", "Karawang Plant", "2019-11-18"),
  employee("emp_sarah", "Sarah Wijaya", "Senior Accountant", "dep_finance", JAKARTA, "2014-04-07"),
  employee("emp_nadia", "Nadia Kusuma", "Accountant", "dep_finance", JAKARTA, "2019-07-15"),
  employee("emp_fajar", "Fajar Ramadhan", "Tax Specialist", "dep_finance", JAKARTA, "2021-01-11"),
  employee("emp_lestari", "Lestari Handayani", "Finance Manager", "dep_finance", JAKARTA, "2012-10-01"),
  employee("emp_hendra", "Hendra Gunawan", "Treasury Analyst", "dep_finance", JAKARTA, "2020-03-02", EmployeeStatus.ON_LEAVE),
  employee("emp_putri", "Putri Anggraini", "Accounts Payable Officer", "dep_finance", JAKARTA, "2022-05-23"),
  employee("emp_rina", "Rina Pratama", "Procurement Manager", "dep_procurement", JAKARTA, "2013-02-18"),
  employee("emp_dimas", "Dimas Nugraha", "Supply Chain Specialist", "dep_procurement", JAKARTA, "2018-06-04"),
  employee("emp_yusuf", "Yusuf Hakim", "Customs Compliance Officer", "dep_procurement", "Tanjung Priok Office", "2016-08-22"),
  employee("emp_indah", "Indah Permata", "Procurement Specialist", "dep_procurement", JAKARTA, "2022-09-12"),
  employee("emp_agus", "Agus Setiawan", "Senior Buyer", "dep_procurement", JAKARTA, "2007-05-14"),
  employee("emp_kevin", "Kevin Hartono", "Backend Engineer", "dep_engineering", JAKARTA, "2020-02-03"),
  employee("emp_raka", "Raka Aditya", "Senior Backend Engineer", "dep_engineering", JAKARTA, "2017-09-18"),
  employee("emp_dina", "Dina Marlina", "Security Engineer", "dep_engineering", JAKARTA, "2019-04-29"),
  employee("emp_teguh", "Teguh Wibowo", "Platform Engineer", "dep_engineering", "Bandung (Remote)", "2018-01-08"),
  employee("emp_citra", "Citra Lestari", "Engineering Manager", "dep_engineering", JAKARTA, "2015-11-02"),
  employee("emp_arief", "Arief Budiman", "Database Engineer", "dep_engineering", JAKARTA, "2016-07-11"),
  employee("emp_gilang", "Gilang Saputra", "Site Reliability Engineer", "dep_engineering", "Yogyakarta (Remote)", "2021-10-04"),
  employee("emp_mega", "Mega Sari", "Frontend Engineer", "dep_engineering", JAKARTA, "2023-03-20"),
  employee("emp_ayu", "Ayu Rahman", "Knowledge Operations Manager", "dep_operations", JAKARTA, "2016-02-15"),
  employee("emp_rudi", "Rudi Hartanto", "Operations Manager", "dep_operations", BEKASI, "2012-06-18"),
  employee("emp_fitri", "Fitri Amalia", "Business Continuity Analyst", "dep_operations", JAKARTA, "2020-08-10"),
  employee("emp_bayu", "Bayu Pratomo", "Logistics Coordinator", "dep_operations", "Cikarang Warehouse", "2019-12-02"),
  employee("emp_wulan", "Wulan Sari", "Health and Safety Officer", "dep_operations", BEKASI, "2021-05-17"),
  employee("emp_maya", "Maya Putri", "Customer Operations Lead", "dep_customer_support", JAKARTA, "2017-03-06"),
  employee("emp_tono", "Tono Sugiarto", "Customer Support Specialist", "dep_customer_support", JAKARTA, "2020-11-09"),
  employee("emp_lina", "Lina Kartika", "Billing Support Specialist", "dep_customer_support", JAKARTA, "2022-01-24"),
  employee("emp_reza", "Reza Firmansyah", "Escalation Manager", "dep_customer_support", JAKARTA, "2016-10-03"),
];

export const knowledgeAreas: KnowledgeAreaSeed[] = [
  {
    id: "ka_line4_troubleshooting",
    name: "Production Line 4 Troubleshooting",
    description:
      "Diagnosing and restoring stoppages on Production Line 4, including conveyor drives, PLC faults, and filler station jams.",
    category: "Manufacturing Operations",
    departmentId: "dep_manufacturing",
    businessCriticality: 0.96,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_hydraulic_calibration",
    name: "Hydraulic Calibration",
    description:
      "Calibrating hydraulic presses and pressure sensors to keep forming tolerances within specification.",
    category: "Equipment Maintenance",
    departmentId: "dep_manufacturing",
    businessCriticality: 0.88,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_stamping_press_diagnosis",
    name: "Stamping Press Diagnosis",
    description:
      "Diagnosing vibration, alignment, and die wear on the stamping presses that feed Production Line 4.",
    category: "Equipment Maintenance",
    departmentId: "dep_manufacturing",
    businessCriticality: 0.82,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_packaging_defects",
    name: "Packaging Defect Investigation",
    description:
      "Investigating seal, label, and carton defects on Packaging Line 2 and tracing them to root causes.",
    category: "Quality Assurance",
    departmentId: "dep_manufacturing",
    businessCriticality: 0.72,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_vendor_maintenance",
    name: "Vendor Maintenance Workflow",
    description:
      "Coordinating scheduled and emergency maintenance with equipment vendors, including site access, permits, and parts.",
    category: "Equipment Maintenance",
    departmentId: "dep_manufacturing",
    businessCriticality: 0.64,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_month_end_closing",
    name: "Month-End Closing",
    description:
      "Running the monthly close: accruals, intercompany eliminations, journal review, and management reporting.",
    category: "Financial Close",
    departmentId: "dep_finance",
    businessCriticality: 0.9,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_bank_reconciliation",
    name: "Bank Reconciliation",
    description:
      "Reconciling operating and payroll bank accounts against the ledger and resolving unmatched items.",
    category: "Financial Close",
    departmentId: "dep_finance",
    businessCriticality: 0.75,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_vat_reporting",
    name: "Indonesia VAT Reporting",
    description:
      "Preparing, validating, and filing monthly Indonesian VAT returns and e-Faktur reconciliations.",
    category: "Tax Compliance",
    departmentId: "dep_finance",
    businessCriticality: 0.86,
    knowledgeDecayRate: 0.04,
  },
  {
    id: "ka_royalty_withholding",
    name: "Royalty Withholding Process",
    description:
      "Calculating and remitting withholding tax on royalty payments to licensors, including tax treaty relief.",
    category: "Tax Compliance",
    departmentId: "dep_finance",
    businessCriticality: 0.58,
    knowledgeDecayRate: 0.04,
  },
  {
    id: "ka_japan_machinery_import",
    name: "Japan Machinery Import Process",
    description:
      "Importing production machinery from Japanese manufacturers, from purchase order and letters of credit to delivery and commissioning.",
    category: "Import and Trade",
    departmentId: "dep_procurement",
    businessCriticality: 0.84,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_customs_clearance",
    name: "Customs Clearance",
    description:
      "Clearing inbound shipments through Indonesian customs, including tariff classification, duties, and inspection holds.",
    category: "Import and Trade",
    departmentId: "dep_procurement",
    businessCriticality: 0.8,
    knowledgeDecayRate: 0.04,
  },
  {
    id: "ka_supplier_contract_renewal",
    name: "Supplier Contract Renewal",
    description:
      "Reviewing supplier performance and renegotiating pricing, service levels, and terms before contracts expire.",
    category: "Supplier Management",
    departmentId: "dep_procurement",
    businessCriticality: 0.62,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_legacy_supplier_import",
    name: "Legacy Supplier Import Procedure",
    description:
      "The paper-based import procedure still used for long-standing suppliers that have not moved to the current import process.",
    category: "Import and Trade",
    departmentId: "dep_procurement",
    businessCriticality: 0.55,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_supplier_onboarding",
    name: "Supplier Onboarding",
    description:
      "Qualifying new suppliers through due diligence, vendor master data, compliance documents, and first-order setup.",
    category: "Supplier Management",
    departmentId: "dep_procurement",
    businessCriticality: 0.5,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_billing_service",
    name: "Billing Service Architecture",
    description:
      "Design and operation of the billing service that invoices parts orders and service contracts.",
    category: "Software Architecture",
    departmentId: "dep_engineering",
    businessCriticality: 0.89,
    knowledgeDecayRate: 0.05,
  },
  {
    id: "ka_postgresql_migration",
    name: "PostgreSQL Migration",
    description:
      "Migrating core application databases to PostgreSQL, including schema conversion, data validation, and cutover.",
    category: "Data Platform",
    departmentId: "dep_engineering",
    businessCriticality: 0.78,
    knowledgeDecayRate: 0.05,
  },
  {
    id: "ka_authentication_service",
    name: "Authentication Service",
    description:
      "The identity and authentication service behind the parts portal and internal tools, including single sign-on and session handling.",
    category: "Security and Identity",
    departmentId: "dep_engineering",
    businessCriticality: 0.87,
    knowledgeDecayRate: 0.05,
  },
  {
    id: "ka_cloud_deployment",
    name: "Cloud Infrastructure Deployment",
    description:
      "Provisioning and deploying Northstar's cloud infrastructure with infrastructure as code and release pipelines.",
    category: "Platform Engineering",
    departmentId: "dep_engineering",
    businessCriticality: 0.83,
    knowledgeDecayRate: 0.06,
  },
  {
    id: "ka_incident_response",
    name: "Incident Response",
    description:
      "Coordinating detection, triage, communication, and recovery for production incidents in customer-facing systems.",
    category: "Operational Resilience",
    departmentId: "dep_engineering",
    businessCriticality: 0.91,
    knowledgeDecayRate: 0.04,
  },
  {
    id: "ka_checkout_architecture",
    name: "Checkout Architecture",
    description:
      "The cart, pricing, and checkout flow of the Northstar Parts Portal, including payment and order handoff.",
    category: "Software Architecture",
    departmentId: "dep_engineering",
    businessCriticality: 0.74,
    knowledgeDecayRate: 0.05,
  },
  {
    id: "ka_warehouse_dispatch",
    name: "Warehouse Dispatch Planning",
    description:
      "Planning daily dispatch from the Cikarang warehouse, including load building, carrier booking, and priority orders.",
    category: "Logistics",
    departmentId: "dep_operations",
    businessCriticality: 0.6,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_safety_approval",
    name: "Safety Approval Process",
    description:
      "Issuing safety approvals and permits to work before maintenance on, or restart of, plant equipment.",
    category: "Health and Safety",
    departmentId: "dep_operations",
    businessCriticality: 0.85,
    knowledgeDecayRate: 0.02,
  },
  {
    id: "ka_customer_refund",
    name: "Customer Refund Workflow",
    description:
      "Validating, approving, and processing customer refunds across the parts portal and service contracts.",
    category: "Customer Operations",
    departmentId: "dep_customer_support",
    businessCriticality: 0.7,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_customer_escalation",
    name: "Customer Escalation Process",
    description:
      "Managing escalations from key industrial accounts, from triage to executive communication and closure.",
    category: "Customer Operations",
    departmentId: "dep_customer_support",
    businessCriticality: 0.76,
    knowledgeDecayRate: 0.03,
  },
  {
    id: "ka_warranty_claims",
    name: "Warranty Claims Handling",
    description:
      "Assessing warranty claims for supplied parts, coordinating returns, and recovering costs from suppliers.",
    category: "Customer Operations",
    departmentId: "dep_customer_support",
    businessCriticality: 0.52,
    knowledgeDecayRate: 0.03,
  },
];

export const businessObjects: BusinessObjectSeed[] = [
  {
    id: "bo_production_line_4",
    name: "Production Line 4",
    type: BusinessObjectType.MACHINE,
    departmentId: "dep_manufacturing",
    criticality: 0.96,
    metadata: { site: BEKASI, output: "Hydraulic fittings", shifts: 3 },
  },
  {
    id: "bo_packaging_line_2",
    name: "Packaging Line 2",
    type: BusinessObjectType.ASSET,
    departmentId: "dep_manufacturing",
    criticality: 0.7,
    metadata: { site: BEKASI },
  },
  {
    id: "bo_month_end_close",
    name: "Month-End Close",
    type: BusinessObjectType.PROCESS,
    departmentId: "dep_finance",
    criticality: 0.9,
    metadata: { cadence: "Monthly", deadline: "Working day 5" },
  },
  {
    id: "bo_tax_compliance",
    name: "Indonesia Tax Compliance",
    type: BusinessObjectType.REGULATION,
    departmentId: "dep_finance",
    criticality: 0.88,
    metadata: { authority: "Directorate General of Taxes" },
  },
  {
    id: "bo_japan_machinery_import",
    name: "Japan Machinery Import",
    type: BusinessObjectType.PROCESS,
    departmentId: "dep_procurement",
    criticality: 0.82,
    metadata: { origin: "Japan", typicalLeadTimeWeeks: 14 },
  },
  {
    id: "bo_hoshiro_precision",
    name: "Hoshiro Precision Machinery",
    type: BusinessObjectType.SUPPLIER,
    departmentId: "dep_procurement",
    criticality: 0.74,
    metadata: { country: "Japan", supplierSince: 2012 },
  },
  {
    id: "bo_billing_service",
    name: "Billing Service",
    type: BusinessObjectType.SERVICE,
    departmentId: "dep_engineering",
    criticality: 0.9,
    metadata: { serviceTier: 1 },
  },
  {
    id: "bo_identity_platform",
    name: "Identity Platform",
    type: BusinessObjectType.SYSTEM,
    departmentId: "dep_engineering",
    criticality: 0.88,
    metadata: { serviceTier: 1 },
  },
  {
    id: "bo_parts_portal",
    name: "Northstar Parts Portal",
    type: BusinessObjectType.PRODUCT,
    departmentId: "dep_engineering",
    criticality: 0.78,
    metadata: { audience: "Industrial customers" },
  },
  {
    id: "bo_cloud_migration",
    name: "Cloud Migration 2026",
    type: BusinessObjectType.PROJECT,
    departmentId: "dep_engineering",
    criticality: 0.72,
    metadata: { targetCompletion: "2026-12" },
  },
  {
    id: "bo_customer_refund",
    name: "Customer Refund Process",
    type: BusinessObjectType.PROCESS,
    departmentId: "dep_customer_support",
    criticality: 0.68,
    metadata: { targetResolutionDays: 10 },
  },
  {
    id: "bo_key_accounts",
    name: "Key Industrial Accounts",
    type: BusinessObjectType.CUSTOMER,
    departmentId: "dep_customer_support",
    criticality: 0.84,
    metadata: { accountCount: 18 },
  },
];

// prettier-ignore
const links: ReadonlyArray<readonly [string, string, number]> = [
  ["ka_line4_troubleshooting", "bo_production_line_4", 1],
  ["ka_line4_troubleshooting", "bo_packaging_line_2", 0.4],
  ["ka_hydraulic_calibration", "bo_production_line_4", 0.8],
  ["ka_hydraulic_calibration", "bo_packaging_line_2", 0.5],
  ["ka_stamping_press_diagnosis", "bo_production_line_4", 0.7],
  ["ka_packaging_defects", "bo_packaging_line_2", 0.9],
  ["ka_packaging_defects", "bo_key_accounts", 0.3],
  ["ka_vendor_maintenance", "bo_production_line_4", 0.5],
  ["ka_vendor_maintenance", "bo_hoshiro_precision", 0.4],
  ["ka_month_end_closing", "bo_month_end_close", 1],
  ["ka_bank_reconciliation", "bo_month_end_close", 0.6],
  ["ka_vat_reporting", "bo_tax_compliance", 1],
  ["ka_royalty_withholding", "bo_tax_compliance", 0.6],
  ["ka_japan_machinery_import", "bo_japan_machinery_import", 1],
  ["ka_japan_machinery_import", "bo_hoshiro_precision", 0.8],
  ["ka_japan_machinery_import", "bo_production_line_4", 0.4],
  ["ka_customs_clearance", "bo_japan_machinery_import", 0.8],
  ["ka_supplier_contract_renewal", "bo_hoshiro_precision", 0.7],
  ["ka_legacy_supplier_import", "bo_japan_machinery_import", 0.3],
  ["ka_legacy_supplier_import", "bo_hoshiro_precision", 0.5],
  ["ka_supplier_onboarding", "bo_hoshiro_precision", 0.3],
  ["ka_billing_service", "bo_billing_service", 1],
  ["ka_billing_service", "bo_month_end_close", 0.4],
  ["ka_billing_service", "bo_parts_portal", 0.5],
  ["ka_postgresql_migration", "bo_cloud_migration", 0.9],
  ["ka_postgresql_migration", "bo_billing_service", 0.5],
  ["ka_authentication_service", "bo_identity_platform", 1],
  ["ka_authentication_service", "bo_parts_portal", 0.6],
  ["ka_cloud_deployment", "bo_cloud_migration", 0.8],
  ["ka_cloud_deployment", "bo_parts_portal", 0.6],
  ["ka_cloud_deployment", "bo_billing_service", 0.5],
  ["ka_incident_response", "bo_billing_service", 0.6],
  ["ka_incident_response", "bo_identity_platform", 0.6],
  ["ka_incident_response", "bo_parts_portal", 0.6],
  ["ka_checkout_architecture", "bo_parts_portal", 0.9],
  ["ka_checkout_architecture", "bo_billing_service", 0.4],
  ["ka_warehouse_dispatch", "bo_key_accounts", 0.6],
  ["ka_safety_approval", "bo_production_line_4", 0.6],
  ["ka_customer_refund", "bo_customer_refund", 1],
  ["ka_customer_refund", "bo_billing_service", 0.4],
  ["ka_customer_escalation", "bo_key_accounts", 0.9],
  ["ka_customer_escalation", "bo_customer_refund", 0.4],
  ["ka_warranty_claims", "bo_key_accounts", 0.5],
  ["ka_warranty_claims", "bo_customer_refund", 0.3],
];

export const knowledgeLinks: KnowledgeLinkSeed[] = links.map(
  ([knowledgeAreaId, businessObjectId, impactWeight]) => ({
    knowledgeAreaId,
    businessObjectId,
    impactWeight,
  }),
);

const {
  CODE_CONTRIBUTION: CODE,
  CODE_REVIEW: REVIEW,
  DOCUMENT_AUTHORED: AUTHORED,
  DOCUMENT_CONTRIBUTION: CONTRIBUTED,
  INCIDENT_RESOLVED: INCIDENT,
  MAINTENANCE_ACTIVITY: MAINTENANCE,
  PEER_CONFIRMATION: PEER,
  PROCESS_EXECUTION: PROCESS,
  PROJECT_PARTICIPATION: PROJECT,
  TICKET_RESOLVED: TICKET,
  TRAINING_COMPLETED: TRAINING,
} = EvidenceType;

// Append new records to the end of a group; a record's position is part of its stable ID.
// prettier-ignore
const evidenceGroups: EvidenceGroup[] = [
  {
    // Scenario A: critical dependency on one maintenance engineer.
    knowledgeAreaId: "ka_line4_troubleshooting",
    records: [
      ["emp_budi", INCIDENT, "Restored Line 4 after a main conveyor drive failure", 1, 9],
      ["emp_budi", MAINTENANCE, "Replaced the worn gearbox coupling on the Line 4 conveyor", 0.95, 16],
      ["emp_budi", INCIDENT, "Cleared a recurring PLC fault on the Line 4 filler station", 0.95, 34],
      ["emp_budi", MAINTENANCE, "Recalibrated the Line 4 capping torque heads", 0.9, 47],
      ["emp_budi", PEER, "Peer confirmation: Line 4 fault diagnosis", 0.8, 60],
      ["emp_budi", AUTHORED, "Wrote the Line 4 emergency restart checklist", 0.9, 75],
      ["emp_budi", MAINTENANCE, "Rebuilt the Line 4 pneumatic manifold during a planned shutdown", 0.9, 102],
      ["emp_budi", INCIDENT, "Diagnosed intermittent sensor dropouts on the Line 4 infeed", 0.9, 138],
      ["emp_budi", PROJECT, "Led the Line 4 reliability improvement project", 0.85, 190],
      ["emp_budi", MAINTENANCE, "Overhauled the Line 4 servo drives", 0.85, 260],
      ["emp_andri", MAINTENANCE, "Assisted the Line 4 conveyor belt replacement", 0.55, 28],
      ["emp_andri", TRAINING, "Completed the Line 4 PLC troubleshooting course", 0.8, 95],
      ["emp_andri", CONTRIBUTED, "Added photos to the Line 4 restart checklist", 0.45, 70],
      ["emp_wahyu", TRAINING, "Completed the Line 4 safety and lockout induction", 0.4, 150],
      ["emp_joko", PROCESS, "Performed a supervised Line 4 restart after a shift change", 0.35, 210],
      ["emp_andri", MAINTENANCE, "Replaced the Line 4 photo-eye sensors with Budi Santoso", 0.6, 52],
    ],
  },
  {
    knowledgeAreaId: "ka_hydraulic_calibration",
    records: [
      ["emp_budi", MAINTENANCE, "Calibrated the press 3 hydraulic pressure sensors", 0.95, 21],
      ["emp_budi", MAINTENANCE, "Replaced a proportional valve and recalibrated press 1", 0.9, 58],
      ["emp_budi", AUTHORED, "Documented hydraulic calibration tolerances for each press", 0.85, 120],
      ["emp_budi", INCIDENT, "Resolved pressure drift that caused out-of-tolerance parts", 0.95, 84],
      ["emp_budi", MAINTENANCE, "Completed the annual hydraulic calibration of the forming presses", 0.85, 330],
      ["emp_eko", MAINTENANCE, "Calibrated the press 2 pressure transducer under supervision", 0.6, 40],
      ["emp_eko", TRAINING, "Completed the vendor hydraulic calibration certification", 0.7, 180],
      ["emp_andri", TRAINING, "Completed the hydraulic systems fundamentals course", 0.5, 240],
    ],
  },
  {
    knowledgeAreaId: "ka_stamping_press_diagnosis",
    records: [
      ["emp_budi", INCIDENT, "Diagnosed die misalignment on stamping press 2", 0.9, 65],
      ["emp_budi", INCIDENT, "Traced press vibration to a worn flywheel bearing", 0.9, 160],
      ["emp_budi", MAINTENANCE, "Replaced the clutch brake unit on stamping press 1", 0.85, 400],
      ["emp_eko", INCIDENT, "Resolved a slug-pulling defect on stamping press 2", 0.85, 30],
      ["emp_eko", MAINTENANCE, "Measured die wear and scheduled regrinding", 0.75, 55],
      ["emp_eko", AUTHORED, "Wrote the stamping press vibration diagnosis guide", 0.8, 100],
      ["emp_siti", CONTRIBUTED, "Added a defect photo reference to the press diagnosis guide", 0.5, 98],
    ],
  },
  {
    knowledgeAreaId: "ka_packaging_defects",
    records: [
      ["emp_siti", INCIDENT, "Traced carton seal failures to glue temperature drift", 0.9, 18],
      ["emp_siti", PROCESS, "Ran weekly defect sampling on Packaging Line 2", 0.75, 25],
      ["emp_siti", AUTHORED, "Wrote the packaging defect root cause template", 0.8, 88],
      ["emp_siti", PROCESS, "Led a label misprint investigation with the printer vendor", 0.8, 140],
      ["emp_joko", PROCESS, "Isolated a defective carton batch during the night shift", 0.7, 44],
      ["emp_joko", INCIDENT, "Resolved a label applicator jam that misaligned labels", 0.75, 120],
      ["emp_eko", PROJECT, "Joined the Packaging Line 2 defect reduction project", 0.65, 200],
    ],
  },
  {
    knowledgeAreaId: "ka_vendor_maintenance",
    records: [
      ["emp_bambang", PROCESS, "Arranged an emergency vendor callout for press 1", 0.8, 150],
      ["emp_bambang", PROCESS, "Approved the annual vendor maintenance schedule", 0.75, 380],
      ["emp_budi", PROCESS, "Coordinated the vendor servo drive overhaul on Line 4", 0.8, 260],
      ["emp_budi", CONTRIBUTED, "Updated the vendor site access and permit checklist", 0.6, 90],
      ["emp_rudi", PROCESS, "Scheduled a vendor maintenance window for Packaging Line 2", 0.75, 35],
      ["emp_rudi", PROJECT, "Joined the spare parts consignment project with vendors", 0.7, 170],
    ],
  },
  {
    // Scenario B: finance knowledge moderately distributed across three people.
    knowledgeAreaId: "ka_month_end_closing",
    records: [
      ["emp_sarah", PROCESS, "Led the August month-end close", 0.95, 3],
      ["emp_sarah", PROCESS, "Led the July month-end close", 0.95, 34],
      ["emp_sarah", PROCESS, "Resolved an intercompany elimination break in the June close", 0.9, 64],
      ["emp_sarah", AUTHORED, "Wrote the month-end close runbook", 0.9, 150],
      ["emp_sarah", PEER, "Peer confirmation: month-end journal review", 0.8, 40],
      ["emp_nadia", PROCESS, "Prepared accruals for the August close", 0.85, 4],
      ["emp_nadia", PROCESS, "Prepared accruals and prepayments for the July close", 0.8, 35],
      ["emp_nadia", CONTRIBUTED, "Updated the accrual steps in the month-end runbook", 0.65, 120],
      ["emp_nadia", TRAINING, "Completed consolidation and eliminations training", 0.6, 200],
      ["emp_fajar", PROCESS, "Posted tax provisions for the August close", 0.75, 5],
      ["emp_fajar", PROCESS, "Posted tax provisions for the July close", 0.7, 36],
      ["emp_fajar", TRAINING, "Completed month-end close onboarding", 0.6, 160],
    ],
  },
  {
    knowledgeAreaId: "ka_bank_reconciliation",
    records: [
      ["emp_nadia", PROCESS, "Reconciled the operating accounts for August", 0.85, 6],
      ["emp_nadia", PROCESS, "Cleared unmatched receipts from the July reconciliation", 0.8, 38],
      ["emp_nadia", PROCESS, "Reconciled the payroll account for the second quarter", 0.75, 70],
      ["emp_putri", PROCESS, "Matched supplier payments in the operating account", 0.7, 60],
      ["emp_putri", PROCESS, "Reconciled the petty cash accounts", 0.6, 95],
      ["emp_hendra", PROCESS, "Reconciled the USD collection account", 0.75, 130],
    ],
  },
  {
    knowledgeAreaId: "ka_vat_reporting",
    records: [
      ["emp_fajar", PROCESS, "Filed the August VAT return", 0.95, 10],
      ["emp_fajar", PROCESS, "Filed the July VAT return", 0.95, 41],
      ["emp_fajar", PROCESS, "Reconciled e-Faktur output tax with the ledger", 0.9, 72],
      ["emp_fajar", AUTHORED, "Documented the monthly VAT filing procedure", 0.85, 110],
      ["emp_fajar", TRAINING, "Completed the VAT regulation update course", 0.7, 150],
      ["emp_sarah", CONTRIBUTED, "Reviewed the VAT filing procedure draft", 0.5, 108],
      ["emp_lestari", PROCESS, "Filed VAT returns before the tax team was formed", 0.7, 900],
    ],
  },
  {
    knowledgeAreaId: "ka_royalty_withholding",
    records: [
      ["emp_lestari", PROCESS, "Calculated royalty withholding for licensor payments", 0.8, 500],
      ["emp_lestari", AUTHORED, "Documented tax treaty relief for royalty payments", 0.8, 620],
      ["emp_fajar", PROCESS, "Remitted second-quarter royalty withholding tax", 0.8, 50],
      ["emp_fajar", TRAINING, "Completed the withholding tax essentials course", 0.6, 190],
    ],
  },
  {
    knowledgeAreaId: "ka_japan_machinery_import",
    records: [
      ["emp_rina", PROCESS, "Managed the import of two CNC machines from Japan", 0.95, 45],
      ["emp_rina", PROCESS, "Opened a letter of credit for a Japanese press purchase", 0.9, 110],
      ["emp_rina", PROJECT, "Led the Line 4 press replacement import project", 0.9, 190],
      ["emp_rina", AUTHORED, "Wrote the Japan machinery import playbook", 0.85, 280],
      ["emp_rina", INCIDENT, "Resolved a shipping document discrepancy with Hoshiro", 0.85, 75],
      ["emp_dimas", PROCESS, "Coordinated sea freight and insurance for the CNC import", 0.85, 44],
      ["emp_dimas", PROCESS, "Arranged a commissioning visit by supplier engineers", 0.8, 20],
      ["emp_dimas", PROJECT, "Supported the Line 4 press replacement import project", 0.75, 185],
      ["emp_indah", TRAINING, "Completed import documentation training", 0.5, 60],
    ],
  },
  {
    knowledgeAreaId: "ka_customs_clearance",
    records: [
      ["emp_yusuf", PROCESS, "Cleared the CNC machine shipment at Tanjung Priok", 0.95, 38],
      ["emp_yusuf", INCIDENT, "Released a shipment held for physical inspection", 1, 70],
      ["emp_yusuf", PROCESS, "Classified new spare parts under tariff codes", 0.9, 95],
      ["emp_yusuf", AUTHORED, "Wrote the customs clearance checklist", 0.85, 210],
      ["emp_yusuf", PROCESS, "Filed a duty drawback claim for re-exported tooling", 0.85, 150],
      ["emp_dimas", TRAINING, "Completed the customs fundamentals course", 0.5, 300],
    ],
  },
  {
    knowledgeAreaId: "ka_supplier_contract_renewal",
    records: [
      ["emp_rina", PROCESS, "Renewed the Hoshiro service agreement", 0.9, 120],
      ["emp_rina", AUTHORED, "Wrote the supplier renewal negotiation guidelines", 0.8, 400],
      ["emp_indah", PROCESS, "Renewed the packaging materials supply contracts", 0.8, 55],
      ["emp_indah", PROCESS, "Ran the supplier performance review for renewals", 0.75, 85],
      ["emp_dimas", PROCESS, "Renegotiated freight forwarder rates", 0.8, 75],
      ["emp_dimas", CONTRIBUTED, "Added logistics terms to the renewal guidelines", 0.55, 390],
    ],
  },
  {
    // Scenario D: aging knowledge, mostly more than two years old.
    knowledgeAreaId: "ka_legacy_supplier_import",
    records: [
      ["emp_agus", PROCESS, "Processed a legacy import for the long-term casting supplier", 0.9, 800],
      ["emp_agus", INCIDENT, "Resolved a rejected legacy import declaration", 0.9, 960],
      ["emp_agus", PROCESS, "Processed a legacy import for the bearing supplier", 0.85, 1100],
      ["emp_agus", AUTHORED, "Wrote the legacy supplier import procedure", 0.85, 1400],
      ["emp_rina", PROCESS, "Approved a legacy import exception", 0.6, 760],
      ["emp_dimas", TRAINING, "Completed a legacy import walkthrough with Agus Setiawan", 0.4, 150],
    ],
  },
  {
    knowledgeAreaId: "ka_supplier_onboarding",
    records: [
      ["emp_indah", PROCESS, "Onboarded two regional packaging suppliers", 0.85, 30],
      ["emp_indah", PROCESS, "Completed due diligence for a new casting supplier", 0.8, 90],
      ["emp_indah", AUTHORED, "Wrote the supplier onboarding checklist", 0.8, 160],
      ["emp_dimas", PROCESS, "Set up logistics terms for a new supplier", 0.7, 110],
      ["emp_rina", PROCESS, "Approved a supplier qualification exception", 0.65, 230],
    ],
  },
  {
    knowledgeAreaId: "ka_billing_service",
    records: [
      ["emp_raka", CODE, "Rewrote invoice generation for service contracts", 0.95, 20],
      ["emp_raka", INCIDENT, "Resolved duplicate invoices after a queue retry storm", 1, 48],
      ["emp_raka", CODE, "Implemented tax line itemization in billing", 0.9, 80],
      ["emp_raka", AUTHORED, "Wrote the billing service architecture decision record", 0.9, 130],
      ["emp_raka", REVIEW, "Reviewed billing retry and idempotency changes", 0.8, 22],
      ["emp_raka", PROJECT, "Led the billing service extraction from the monolith", 0.9, 300],
      ["emp_kevin", CODE, "Added the invoice PDF rendering endpoint", 0.7, 60],
      ["emp_kevin", REVIEW, "Reviewed the billing currency rounding fix", 0.6, 95],
      ["emp_lina", TICKET, "Investigated a customer billing discrepancy with engineering", 0.45, 30],
    ],
  },
  {
    knowledgeAreaId: "ka_postgresql_migration",
    records: [
      ["emp_arief", PROJECT, "Led the PostgreSQL migration of the orders database", 0.95, 40],
      ["emp_arief", CODE, "Built data validation scripts for the migration cutover", 0.9, 55],
      ["emp_arief", AUTHORED, "Wrote the PostgreSQL cutover runbook", 0.9, 70],
      ["emp_arief", INCIDENT, "Resolved replication lag during a migration rehearsal", 0.9, 100],
      ["emp_kevin", CODE, "Migrated billing queries to PostgreSQL syntax", 0.8, 50],
      ["emp_kevin", REVIEW, "Reviewed the schema conversion for the parts catalog", 0.65, 85],
      ["emp_teguh", PROJECT, "Provisioned PostgreSQL clusters for the migration", 0.7, 120],
    ],
  },
  {
    // Scenario C: healthy coverage across three engineers.
    knowledgeAreaId: "ka_authentication_service",
    records: [
      ["emp_kevin", CODE, "Implemented refresh token rotation", 0.9, 15],
      ["emp_kevin", INCIDENT, "Resolved an SSO login loop after an identity provider change", 0.95, 42],
      ["emp_kevin", REVIEW, "Reviewed session handling changes", 0.75, 60],
      ["emp_kevin", AUTHORED, "Wrote the sign-in audit event specification", 0.85, 110],
      ["emp_raka", CODE, "Designed the tenant-aware authorization middleware", 0.95, 35],
      ["emp_raka", REVIEW, "Reviewed the password reset flow", 0.85, 24],
      ["emp_raka", INCIDENT, "Resolved token validation failures after a key rotation", 0.75, 90],
      ["emp_raka", AUTHORED, "Wrote the authentication service design notes", 0.85, 160],
      ["emp_dina", INCIDENT, "Contained a credential stuffing attempt on the parts portal", 0.85, 28],
      ["emp_dina", AUTHORED, "Wrote the authentication threat model", 0.85, 75],
      ["emp_dina", REVIEW, "Reviewed the MFA enrollment changes", 0.7, 50],
      ["emp_dina", CODE, "Added rate limiting to the sign-in endpoint", 0.7, 130],
    ],
  },
  {
    knowledgeAreaId: "ka_cloud_deployment",
    records: [
      ["emp_teguh", CODE, "Rebuilt the deployment pipelines with infrastructure as code", 0.95, 25],
      ["emp_teguh", INCIDENT, "Recovered a failed production deployment with a rollback", 0.95, 52],
      ["emp_teguh", AUTHORED, "Wrote the cloud environment provisioning guide", 0.85, 90],
      ["emp_teguh", PROJECT, "Led the Cloud Migration 2026 landing zone setup", 0.9, 140],
      ["emp_teguh", CODE, "Automated TLS certificate renewal", 0.8, 175],
      ["emp_gilang", INCIDENT, "Resolved an autoscaling misconfiguration during peak traffic", 0.85, 33],
      ["emp_gilang", CODE, "Added deployment health checks to the pipeline", 0.75, 66],
      ["emp_gilang", TRAINING, "Completed a cloud architecture certification", 0.6, 220],
    ],
  },
  {
    knowledgeAreaId: "ka_incident_response",
    records: [
      ["emp_gilang", INCIDENT, "Coordinated the response to the portal checkout outage", 0.95, 12],
      ["emp_gilang", INCIDENT, "Led the incident review for the billing delay", 0.85, 47],
      ["emp_gilang", AUTHORED, "Wrote the on-call escalation runbook", 0.85, 95],
      ["emp_teguh", INCIDENT, "Restored service after a DNS misconfiguration", 0.9, 52],
      ["emp_teguh", INCIDENT, "Handled a database failover during a storage outage", 0.9, 150],
      ["emp_dina", INCIDENT, "Led the response to a suspicious sign-in spike", 0.9, 28],
      ["emp_dina", CONTRIBUTED, "Added security steps to the on-call runbook", 0.6, 93],
      ["emp_fitri", AUTHORED, "Wrote the incident communication templates", 0.75, 120],
      ["emp_citra", PROJECT, "Sponsored the incident management process rollout", 0.6, 240],
    ],
  },
  {
    knowledgeAreaId: "ka_checkout_architecture",
    records: [
      ["emp_mega", CODE, "Rebuilt the cart summary for bulk part orders", 0.8, 20],
      ["emp_mega", CODE, "Added saved quotes to the checkout flow", 0.75, 75],
      ["emp_kevin", CODE, "Integrated checkout with the billing service", 0.85, 45],
      ["emp_kevin", REVIEW, "Reviewed the payment provider callback handling", 0.7, 100],
      ["emp_raka", AUTHORED, "Wrote the original checkout architecture document", 0.8, 700],
      ["emp_citra", PROJECT, "Led the parts portal checkout redesign", 0.7, 420],
    ],
  },
  {
    knowledgeAreaId: "ka_warehouse_dispatch",
    records: [
      ["emp_bayu", PROCESS, "Planned dispatch for the end-of-quarter order peak", 0.9, 30],
      ["emp_bayu", PROCESS, "Rebooked carriers after a port congestion delay", 0.85, 58],
      ["emp_bayu", PROCESS, "Built a priority load plan for a key account outage", 0.85, 90],
      ["emp_bayu", AUTHORED, "Wrote the daily dispatch planning guide", 0.8, 200],
      ["emp_rudi", PROCESS, "Approved the weekend dispatch schedule", 0.6, 80],
    ],
  },
  {
    knowledgeAreaId: "ka_safety_approval",
    records: [
      ["emp_wulan", PROCESS, "Issued a permit to work for the Line 4 conveyor repair", 0.9, 9],
      ["emp_wulan", PROCESS, "Ran the safety sign-off before the press 1 restart", 0.85, 58],
      ["emp_wulan", AUTHORED, "Updated the permit-to-work procedure", 0.8, 140],
      ["emp_bambang", PROCESS, "Approved a high-risk work permit for hydraulic maintenance", 0.8, 84],
      ["emp_bambang", PEER, "Peer confirmation: safety approval authority", 0.6, 300],
      ["emp_rudi", TRAINING, "Completed permit-to-work issuer training", 0.6, 180],
    ],
  },
  {
    knowledgeAreaId: "ka_customer_refund",
    records: [
      ["emp_maya", PROCESS, "Approved refunds for a cancelled service contract", 0.85, 14],
      ["emp_maya", AUTHORED, "Wrote the refund eligibility guidelines", 0.85, 120],
      ["emp_maya", TICKET, "Resolved a disputed refund for a key account", 0.85, 40],
      ["emp_lina", TICKET, "Processed partial refunds for returned parts", 0.8, 8],
      ["emp_lina", TICKET, "Corrected a refund posted to the wrong invoice", 0.75, 36],
      ["emp_lina", PROCESS, "Reconciled monthly refunds with finance", 0.75, 5],
      ["emp_tono", TICKET, "Processed a refund for a cancelled portal order", 0.6, 22],
    ],
  },
  {
    knowledgeAreaId: "ka_customer_escalation",
    records: [
      ["emp_reza", INCIDENT, "Managed an escalation over delayed Line 4 spare parts", 0.95, 16],
      ["emp_reza", INCIDENT, "Resolved a key account escalation over invoice errors", 0.9, 50],
      ["emp_reza", PROCESS, "Ran the quarterly escalation review with key accounts", 0.85, 70],
      ["emp_reza", PROCESS, "Coordinated the executive response to a warranty dispute", 0.85, 130],
      ["emp_reza", AUTHORED, "Wrote the customer escalation playbook", 0.85, 260],
      ["emp_maya", PROCESS, "Handled first-line triage for a key account escalation", 0.65, 48],
      ["emp_maya", TRAINING, "Completed escalation management training", 0.55, 180],
    ],
  },
  {
    knowledgeAreaId: "ka_warranty_claims",
    records: [
      ["emp_tono", TICKET, "Assessed a warranty claim for failed hydraulic fittings", 0.8, 12],
      ["emp_tono", TICKET, "Arranged returns for a batch of defective seals", 0.75, 45],
      ["emp_tono", TICKET, "Recovered warranty costs from a bearing supplier", 0.75, 90],
      ["emp_maya", AUTHORED, "Wrote the warranty claim assessment checklist", 0.75, 150],
      ["emp_siti", CONTRIBUTED, "Added quality inspection criteria to the warranty checklist", 0.55, 140],
    ],
  },
];

const evidenceSources: Record<
  EvidenceType,
  { source: string; prefix: string }
> = {
  CODE_CONTRIBUTION: { source: "Code repository", prefix: "PR" },
  CODE_REVIEW: { source: "Code repository", prefix: "PR" },
  DOCUMENT_AUTHORED: { source: "Document library", prefix: "DOC" },
  DOCUMENT_CONTRIBUTION: { source: "Document library", prefix: "DOC" },
  INCIDENT_RESOLVED: { source: "Incident log", prefix: "INC" },
  MAINTENANCE_ACTIVITY: { source: "Maintenance system", prefix: "MNT" },
  PEER_CONFIRMATION: { source: "Peer confirmation", prefix: "PEER" },
  PROCESS_EXECUTION: { source: "Process log", prefix: "RUN" },
  PROJECT_PARTICIPATION: { source: "Project register", prefix: "PRJ" },
  TICKET_RESOLVED: { source: "Service desk", prefix: "SD" },
  TRAINING_COMPLETED: { source: "Learning portal", prefix: "TRN" },
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function buildEvidence(
  referenceDate: Date = SEED_REFERENCE_DATE,
): EvidenceSeed[] {
  return evidenceGroups.flatMap((group, groupIndex) =>
    group.records.map(
      ([employeeId, type, title, strength, ageInDays], recordIndex) => {
        const { source, prefix } = evidenceSources[type];
        const sequence = String(recordIndex + 1).padStart(3, "0");

        return {
          id: `ev_${group.knowledgeAreaId.slice("ka_".length)}_${sequence}`,
          employeeId,
          knowledgeAreaId: group.knowledgeAreaId,
          type,
          title,
          source,
          sourceReference: `${prefix}-${String(groupIndex + 1).padStart(2, "0")}${sequence}`,
          strength,
          occurredAt: new Date(referenceDate.getTime() - ageInDays * DAY_IN_MS),
        };
      },
    ),
  );
}
