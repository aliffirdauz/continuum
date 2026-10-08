import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransferActivityType, TransferPlanStatus } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

import { OptionalResourceId } from "../common/decorators/query-parameter.decorators";
import { PaginationQueryDto } from "../common/pagination";
import { RESOURCE_ID_PATTERN } from "../common/resource-id";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;

export class TransferListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TransferPlanStatus })
  @IsOptional()
  @IsEnum(TransferPlanStatus)
  status?: TransferPlanStatus;

  @OptionalResourceId()
  knowledgeAreaId?: string;
}

export class CreateTransferDto {
  @ApiProperty({ example: "ka_line4_troubleshooting" })
  @IsString()
  @Matches(RESOURCE_ID_PATTERN)
  knowledgeAreaId!: string;

  @ApiProperty({ example: "emp_budi" })
  @IsString()
  @Matches(RESOURCE_ID_PATTERN)
  primaryHolderId!: string;

  @ApiProperty({ example: "emp_andri" })
  @IsString()
  @Matches(RESOURCE_ID_PATTERN)
  backupEmployeeId!: string;

  @ApiPropertyOptional({ default: 70, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  targetCoverage?: number;

  @ApiProperty({ example: "2026-12-31", description: "UTC calendar date" })
  @IsString()
  @Matches(DATE_ONLY, { message: "targetDate must be YYYY-MM-DD" })
  targetDate!: string;
}

export class UpdateTransferDto {
  @ApiPropertyOptional({ enum: TransferPlanStatus })
  @IsOptional()
  @IsEnum(TransferPlanStatus)
  status?: TransferPlanStatus;

  @ApiPropertyOptional({ example: "2027-01-31" })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY, { message: "targetDate must be YYYY-MM-DD" })
  targetDate?: string;
}

export class CreateActivityDto {
  @ApiProperty({ enum: TransferActivityType })
  @IsEnum(TransferActivityType)
  type!: TransferActivityType;

  @ApiProperty({ minLength: 3, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ default: 1, minimum: 0.1, maximum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(1)
  weight?: number;
}

export class CompleteActivityDto {
  @ApiProperty({ enum: ["COMPLETED"] })
  @IsIn(["COMPLETED"])
  status!: "COMPLETED";
}
