import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

export class CreateSimulationDto {
  @ApiProperty({ example: "emp_budi" })
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,128}$/)
  employeeId!: string;

  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;
}

export class SimulationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{1,128}$/)
  departmentId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
