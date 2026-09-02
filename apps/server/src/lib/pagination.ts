import { z } from "zod";

export const paginationQueryFields = {
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
};

export type PaginationInput = {
  limit: number;
  offset: number;
};

export function createPage<T>(rows: T[], input: PaginationInput) {
  const hasMore = rows.length > input.limit;

  return {
    items: hasMore ? rows.slice(0, input.limit) : rows,
    page: {
      hasMore,
      limit: input.limit,
      offset: input.offset,
    },
  };
}
