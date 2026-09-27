import { ApiPropertyOptional } from "@nestjs/swagger";
import { BusinessObjectType } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";

import {
  OptionalResourceId,
  OptionalSearchTerm,
} from "../../common/decorators/query-parameter.decorators";
import { PaginationQueryDto } from "../../common/pagination";

export class BusinessObjectQueryDto extends PaginationQueryDto {
  @OptionalSearchTerm()
  search?: string;

  @OptionalResourceId()
  departmentId?: string;

  @ApiPropertyOptional({ enum: BusinessObjectType })
  @IsOptional()
  @IsEnum(BusinessObjectType)
  type?: BusinessObjectType;
}
