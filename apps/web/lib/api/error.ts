import { apiErrorResponseSchema, type ApiError } from "@orbit/contracts/api";
import type { z } from "zod";
import { isXiorError } from "xior";

export class OrbitApiError extends Error {
  readonly code: string;
  readonly fields?: ApiError["fields"];
  readonly status: number | null;

  constructor(error: ApiError, status: number | null) {
    super(error.message);
    this.name = "OrbitApiError";
    this.code = error.code;
    this.fields = error.fields;
    this.status = status;
  }
}

export function toOrbitApiError(error: unknown): OrbitApiError {
  if (error instanceof OrbitApiError) {
    return error;
  }

  if (isXiorError(error)) {
    const parsedResponse = apiErrorResponseSchema.safeParse(
      error.response?.data,
    );

    if (parsedResponse.success) {
      return new OrbitApiError(
        parsedResponse.data.error,
        error.response?.status ?? null,
      );
    }

    return new OrbitApiError(
      {
        code: error.response ? "REQUEST_FAILED" : "NETWORK_ERROR",
        message: error.response
          ? "The request could not be completed."
          : "Orbit could not reach the server.",
      },
      error.response?.status ?? null,
    );
  }

  return new OrbitApiError(
    {
      code: "UNEXPECTED_ERROR",
      message: "An unexpected error occurred.",
    },
    null,
  );
}

export function parseApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  status: number,
): T {
  const parsedResponse = schema.safeParse(data);

  if (!parsedResponse.success) {
    throw new OrbitApiError(
      {
        code: "INVALID_RESPONSE",
        message: "The server returned an unexpected response.",
      },
      status,
    );
  }

  return parsedResponse.data;
}
