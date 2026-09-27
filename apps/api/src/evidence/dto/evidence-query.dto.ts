import { ApiPropertyOptional } from "@nestjs/swagger";
import { EvidenceType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import { OptionalResourceId } from "../../common/decorators/query-parameter.decorators";
import { PaginationQueryDto } from "../../common/pagination";

export class EvidenceQueryDto extends PaginationQueryDto {
  @OptionalResourceId()
  knowledgeAreaId?: string;

  @OptionalResourceId()
  employeeId?: string;

  @ApiPropertyOptional({ enum: EvidenceType })
  @IsOptional()
  @IsEnum(EvidenceType)
  type?: EvidenceType;
}
