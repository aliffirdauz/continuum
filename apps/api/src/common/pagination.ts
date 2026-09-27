import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: MAX_PAGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page: number = 1;

  @ApiPropertyOptional({
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize: number = DEFAULT_PAGE_SIZE;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

type PageRequest = Pick<PaginationQueryDto, "page" | "pageSize">;

export function toSkipTake({ page, pageSize }: PageRequest) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginate<T>(
  data: T[],
  total: number,
  { page, pageSize }: PageRequest,
): Paginated<T> {
  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
