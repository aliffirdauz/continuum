import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { EmployeeStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import {
  OptionalResourceId,
  OptionalSearchTerm,
} from "../../common/decorators/query-parameter.decorators";
import { PaginationQueryDto } from "../../common/pagination";
import { EvidenceQueryDto } from "../../evidence/dto/evidence-query.dto";

export class EmployeeQueryDto extends PaginationQueryDto {
  @OptionalSearchTerm()
  search?: string;

  @OptionalResourceId()
  departmentId?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}

export class EmployeeEvidenceQueryDto extends OmitType(EvidenceQueryDto, [
  "employeeId",
] as const) {}
