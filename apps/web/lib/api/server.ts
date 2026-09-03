import "server-only";

import { cookies } from "next/headers";
import type { z } from "zod";
import xior, { type XiorRequestConfig } from "xior";

import { parseApiResponse, toOrbitApiError } from "./error";
import { apiOrigin } from "./origin";

export async function requestServerApi<T>(
  schema: z.ZodType<T>,
  config: XiorRequestConfig,
): Promise<T> {
  const cookieStore = await cookies();
  const serverClient = xior.create({
    baseURL: `${apiOrigin}/api`,
    headers: {
      cookie: cookieStore.toString(),
    },
    timeout: 12_000,
  });

  try {
    const response = await serverClient.request<unknown>({
      ...config,
      cache: "no-store",
    });
    return parseApiResponse(schema, response.data, response.status);
  } catch (error) {
    throw toOrbitApiError(error);
  }
}
