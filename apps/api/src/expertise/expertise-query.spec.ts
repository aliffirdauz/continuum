import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  ExpertisePageQueryDto,
  ExpertSearchQueryDto,
} from "./expertise-query.dto";

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});
async function validate<T extends object>(type: new () => T, value: object) {
  return pipe.transform(value, { type: "query", metatype: type }) as Promise<T>;
}

describe("expertise query boundary", () => {
  it.each([
    "not-a-date",
    "2026-02-30T00:00:00Z",
    "2026-09-01",
    "2026-09-01T25:00:00Z",
  ])("rejects invalid asOf %s", async (asOf) => {
    await expect(
      validate(ExpertisePageQueryDto, { asOf }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("requires a nonblank search term", async () => {
    await expect(
      validate(ExpertSearchQueryDto, { q: "  " }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it("accepts pagination and a timestamp", async () => {
    expect(
      await validate(ExpertisePageQueryDto, {
        page: "2",
        pageSize: "5",
        asOf: "2026-09-01T00:00:00Z",
      }),
    ).toMatchObject({ page: 2, pageSize: 5, asOf: "2026-09-01T00:00:00Z" });
  });
});
