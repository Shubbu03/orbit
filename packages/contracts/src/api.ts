import { z } from "zod";

export const apiFieldErrorsSchema = z.record(z.string(), z.array(z.string()));

export const apiErrorSchema = z
  .object({
    code: z.string().min(1),
    fields: apiFieldErrorsSchema.optional(),
    message: z.string().min(1),
  })
  .strict();

export const apiErrorResponseSchema = z
  .object({
    error: apiErrorSchema,
  })
  .strict();

export const pageSchema = z
  .object({
    hasMore: z.boolean(),
    limit: z.number().int().min(1).max(100),
    offset: z.number().int().min(0),
  })
  .strict();

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type Page = z.infer<typeof pageSchema>;
