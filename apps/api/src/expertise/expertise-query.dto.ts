import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
} from "class-validator";
import { PaginationQueryDto } from "../common/pagination";

const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;
function validAsOf(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  return (
    typeof value === "string" &&
    ISO_INSTANT.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    value.length <= 35 &&
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) ===
      value.slice(0, 10)
  );
}
function IsAsOf(): PropertyDecorator {
  return (target, propertyName) =>
    registerDecorator({
      name: "isAsOf",
      target: target.constructor,
      propertyName: String(propertyName),
      validator: {
        validate: validAsOf,
        defaultMessage: () => "asOf must be a valid ISO timestamp",
      },
    });
}
export class ExpertisePageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "ISO timestamp used for deterministic scoring",
  })
  @IsOptional()
  @IsAsOf()
  asOf?: string | Date;
}

export class ExpertSearchQueryDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  q!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsAsOf()
  asOf?: string | Date;
}
