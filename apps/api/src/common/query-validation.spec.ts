import { plainToInstance, type ClassConstructor } from "class-transformer";
import { validate } from "class-validator";

import { EmployeeQueryDto } from "../employees/dto/employee-query.dto";
import { EvidenceQueryDto } from "../evidence/dto/evidence-query.dto";
import {
  KnowledgeEvidenceQueryDto,
  KnowledgeQueryDto,
} from "../knowledge/dto/knowledge-query.dto";

// Mirrors the options of the global ValidationPipe in main.ts.
async function parse<T extends object>(
  dto: ClassConstructor<T>,
  query: Record<string, unknown>,
) {
  const instance = plainToInstance(dto, query);
  const errors = await validate(instance, {
    forbidNonWhitelisted: true,
    whitelist: true,
  });

  return { instance, invalid: errors.map(({ property }) => property) };
}

describe("query validation", () => {
  it("applies pagination defaults and converts query strings to numbers", async () => {
    await expect(parse(KnowledgeQueryDto, {})).resolves.toMatchObject({
      instance: { page: 1, pageSize: 20, sort: "name" },
      invalid: [],
    });
    await expect(
      parse(KnowledgeQueryDto, { page: "2", pageSize: "50" }),
    ).resolves.toMatchObject({ instance: { page: 2, pageSize: 50 } });
  });

  it.each([
    { page: "0" },
    { page: "1.5" },
    { page: "abc" },
    { pageSize: "0" },
    { pageSize: "101" },
  ])("rejects invalid pagination %j", async (query) => {
    const { invalid } = await parse(EvidenceQueryDto, query);

    expect(invalid.length).toBeGreaterThan(0);
  });

  it("trims search terms and ignores blank ones", async () => {
    await expect(
      parse(KnowledgeQueryDto, { search: "  line 4  " }),
    ).resolves.toMatchObject({ instance: { search: "line 4" } });
    await expect(
      parse(EmployeeQueryDto, { search: "   " }),
    ).resolves.toMatchObject({ instance: { search: undefined }, invalid: [] });
  });

  it.each([
    [KnowledgeQueryDto, { search: "x".repeat(101) }, "search"],
    [KnowledgeQueryDto, { departmentId: "dep manufacturing" }, "departmentId"],
    [KnowledgeQueryDto, { sort: "risk" }, "sort"],
    [KnowledgeQueryDto, { order: "sideways" }, "order"],
    [KnowledgeQueryDto, { status: "DELETED" }, "status"],
    [EmployeeQueryDto, { status: "FIRED" }, "status"],
    [EvidenceQueryDto, { type: "GOSSIP" }, "type"],
    [EvidenceQueryDto, { unexpected: "value" }, "unexpected"],
  ] as const)("rejects %o with %j", async (dto, query, property) => {
    const { invalid } = await parse(dto, query);

    expect(invalid).toContain(property);
  });

  it("does not let a nested evidence route override its parent ID", async () => {
    const { instance, invalid } = await parse(KnowledgeEvidenceQueryDto, {
      knowledgeAreaId: "ka_other",
    });

    expect(instance).toMatchObject({ page: 1, pageSize: 20 });
    expect(invalid).toContain("knowledgeAreaId");
  });
});
