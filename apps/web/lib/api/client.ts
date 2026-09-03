"use client";

import type { z } from "zod";
import xior, { type XiorRequestConfig } from "xior";

import { parseApiResponse, toOrbitApiError } from "./error";
import { apiOrigin } from "./origin";

export const apiClient = xior.create({
  baseURL: `${apiOrigin}/api`,
  credentials: "include",
  timeout: 12_000,
});

export async function requestApi<T>(
  schema: z.ZodType<T>,
  config: XiorRequestConfig,
): Promise<T> {
  try {
    const response = await apiClient.request<unknown>(config);
    return parseApiResponse(schema, response.data, response.status);
  } catch (error) {
    throw toOrbitApiError(error);
  }
}

export async function requestApiVoid(config: XiorRequestConfig): Promise<void> {
  try {
    await apiClient.request(config);
  } catch (error) {
    throw toOrbitApiError(error);
  }
}
