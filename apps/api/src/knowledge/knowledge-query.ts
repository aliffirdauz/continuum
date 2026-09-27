import type { Prisma } from "@prisma/client";

import type { KnowledgeQueryDto, SortOrder } from "./dto/knowledge-query.dto";

type KnowledgeFilters = Pick<
  KnowledgeQueryDto,
  "search" | "departmentId" | "category" | "status"
>;

export function buildKnowledgeWhere({
  search,
  departmentId,
  category,
  status,
}: KnowledgeFilters): Prisma.KnowledgeAreaWhereInput {
  return {
    departmentId,
    category,
    status,
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    }),
  };
}

export function buildKnowledgeOrderBy({
  sort,
  order,
}: Pick<
  KnowledgeQueryDto,
  "sort" | "order"
>): Prisma.KnowledgeAreaOrderByWithRelationInput[] {
  if (sort === "criticality") {
    const direction: SortOrder = order ?? "desc";
    return [{ businessCriticality: direction }, { name: "asc" }];
  }

  return [{ name: order ?? "asc" }];
}
