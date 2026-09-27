import { applyDecorators } from "@nestjs/common";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

import { RESOURCE_ID_PATTERN } from "../resource-id";

export const MAX_SEARCH_LENGTH = 100;

export function OptionalSearchTerm() {
  return applyDecorators(
    ApiPropertyOptional({ maxLength: MAX_SEARCH_LENGTH }),
    IsOptional(),
    Transform(({ value }: { value: unknown }) =>
      typeof value === "string" ? value.trim() || undefined : value,
    ),
    IsString(),
    MaxLength(MAX_SEARCH_LENGTH),
  );
}

export function OptionalResourceId() {
  return applyDecorators(
    ApiPropertyOptional({ pattern: RESOURCE_ID_PATTERN.source }),
    IsOptional(),
    Matches(RESOURCE_ID_PATTERN, { message: "$property is not a valid ID" }),
  );
}
