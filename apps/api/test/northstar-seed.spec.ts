import {
  SEED_REFERENCE_DATE,
  buildEvidence,
  businessObjects,
  departments,
  employees,
  knowledgeAreas,
  knowledgeLinks,
} from "../prisma/seed-data/northstar";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function expectUnique(values: string[]) {
  expect(new Set(values).size).toBe(values.length);
}

function expectUnitInterval(values: number[]) {
  for (const value of values) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
}

describe("Northstar seed dataset", () => {
  const evidence = buildEvidence();

  it("matches the size of the specified demo organization", () => {
    expect(departments).toHaveLength(6);
    expect(employees).toHaveLength(35);
    expect(knowledgeAreas).toHaveLength(25);
    expect(businessObjects).toHaveLength(12);
    expect(evidence.length).toBeGreaterThanOrEqual(120);
    expect(evidence.length).toBeLessThanOrEqual(200);
  });

  it("uses unique, stable, prefixed identifiers", () => {
    const groups: Array<[string, string[]]> = [
      ["dep_", departments.map(({ id }) => id)],
      ["emp_", employees.map(({ id }) => id)],
      ["ka_", knowledgeAreas.map(({ id }) => id)],
      ["bo_", businessObjects.map(({ id }) => id)],
      ["ev_", evidence.map(({ id }) => id)],
    ];

    for (const [prefix, ids] of groups) {
      expectUnique(ids);
      for (const id of ids) {
        expect(id).toMatch(new RegExp(`^${prefix}[a-z0-9_]+$`));
      }
    }

    expectUnique(employees.map(({ email }) => email));
    expectUnique(knowledgeAreas.map(({ name }) => name));
    expectUnique(businessObjects.map(({ name }) => name));
    expectUnique(
      knowledgeLinks.map(
        ({ knowledgeAreaId, businessObjectId }) =>
          `${knowledgeAreaId}:${businessObjectId}`,
      ),
    );
  });

  it("only references records that exist", () => {
    const departmentIds = new Set(departments.map(({ id }) => id));
    const employeeIds = new Set(employees.map(({ id }) => id));
    const knowledgeAreaIds = new Set(knowledgeAreas.map(({ id }) => id));
    const businessObjectIds = new Set(businessObjects.map(({ id }) => id));

    for (const record of [
      ...employees,
      ...knowledgeAreas,
      ...businessObjects,
    ]) {
      expect(departmentIds).toContain(record.departmentId);
    }
    for (const link of knowledgeLinks) {
      expect(knowledgeAreaIds).toContain(link.knowledgeAreaId);
      expect(businessObjectIds).toContain(link.businessObjectId);
    }
    for (const record of evidence) {
      expect(employeeIds).toContain(record.employeeId);
      expect(knowledgeAreaIds).toContain(record.knowledgeAreaId);
    }
  });

  it("keeps every weighted value within the database range", () => {
    expectUnitInterval(knowledgeAreas.map((area) => area.businessCriticality));
    expectUnitInterval(knowledgeAreas.map((area) => area.knowledgeDecayRate));
    expectUnitInterval(businessObjects.map((object) => object.criticality));
    expectUnitInterval(knowledgeLinks.map((link) => link.impactWeight));
    expectUnitInterval(evidence.map((record) => record.strength));
  });

  it("gives every knowledge area evidence and a business object", () => {
    for (const area of knowledgeAreas) {
      expect(
        evidence.some((record) => record.knowledgeAreaId === area.id),
      ).toBe(true);
      expect(
        knowledgeLinks.some((link) => link.knowledgeAreaId === area.id),
      ).toBe(true);
    }
  });

  it("includes the knowledge areas and people named in the specification", () => {
    const areaNames = knowledgeAreas.map(({ name }) => name);
    const employeeNames = employees.map(({ name }) => name);

    expect(areaNames).toEqual(
      expect.arrayContaining([
        "Production Line 4 Troubleshooting",
        "Hydraulic Calibration",
        "Month-End Closing",
        "Bank Reconciliation",
        "Indonesia VAT Reporting",
        "Japan Machinery Import Process",
        "Customs Clearance",
        "Supplier Contract Renewal",
        "Customer Refund Workflow",
        "Billing Service Architecture",
        "PostgreSQL Migration",
        "Authentication Service",
        "Cloud Infrastructure Deployment",
        "Incident Response",
        "Customer Escalation Process",
        "Legacy Supplier Import Procedure",
      ]),
    );
    expect(employeeNames).toEqual(
      expect.arrayContaining([
        "Budi Santoso",
        "Andri Pratama",
        "Rina Pratama",
        "Dimas Nugraha",
        "Sarah Wijaya",
        "Kevin Hartono",
        "Maya Putri",
      ]),
    );
  });

  it("is deterministic across runs", () => {
    expect(buildEvidence()).toEqual(evidence);

    for (const record of evidence) {
      expect(record.occurredAt.getTime()).toBeLessThanOrEqual(
        SEED_REFERENCE_DATE.getTime(),
      );
    }
  });

  it("concentrates Line 4 troubleshooting evidence in one person (scenario A)", () => {
    const line4 = evidence.filter(
      (record) => record.knowledgeAreaId === "ka_line4_troubleshooting",
    );
    const budi = line4.filter((record) => record.employeeId === "emp_budi");

    expect(budi.length / line4.length).toBeGreaterThan(0.6);
    expect(new Set(budi.map(({ type }) => type)).size).toBeGreaterThanOrEqual(
      5,
    );
  });

  it("keeps most legacy import evidence older than two years (scenario D)", () => {
    const legacy = evidence.filter(
      (record) => record.knowledgeAreaId === "ka_legacy_supplier_import",
    );
    const aging = legacy.filter(
      (record) =>
        SEED_REFERENCE_DATE.getTime() - record.occurredAt.getTime() >
        730 * DAY_IN_MS,
    );

    expect(aging.length / legacy.length).toBeGreaterThan(0.5);
  });
});
