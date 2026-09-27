import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { KnowledgeAreaStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from "class-validator";

import {
  OptionalResourceId,
  OptionalSearchTerm,
} from "../../common/decorators/query-parameter.decorators";
import { PaginationQueryDto } from "../../common/pagination";
import { EvidenceQueryDto } from "../../evidence/dto/evidence-query.dto";

export const KNOWLEDGE_SORT_FIELDS = ["criticality", "name"] as const;
export type KnowledgeSortField = (typeof KNOWLEDGE_SORT_FIELDS)[number];

export const SORT_ORDERS = ["asc", "desc"] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class KnowledgeQueryDto extends PaginationQueryDto {
  @OptionalSearchTerm()
  search?: string;

  @OptionalResourceId()
  departmentId?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() || undefined : value,
  )
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: KnowledgeAreaStatus })
  @IsOptional()
  @IsEnum(KnowledgeAreaStatus)
  status?: KnowledgeAreaStatus;

  @ApiPropertyOptional({ enum: KNOWLEDGE_SORT_FIELDS, default: "name" })
  @IsOptional()
  @IsIn(KNOWLEDGE_SORT_FIELDS)
  sort: KnowledgeSortField = "name";

  @ApiPropertyOptional({
    enum: SORT_ORDERS,
    description:
      "Defaults to descending for criticality and ascending for name",
  })
  @IsOptional()
  @IsIn(SORT_ORDERS)
  order?: SortOrder;
}

export class KnowledgeEvidenceQueryDto extends OmitType(EvidenceQueryDto, [
  "knowledgeAreaId",
] as const) {}
