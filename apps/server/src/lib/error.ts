import { z } from "zod";

export function getFieldErrors<T extends Record<string, unknown>>(
  error: z.ZodError<T>,
): Record<string, string[]> {
  const errorTree = z.treeifyError(error);

  return Object.fromEntries(
    Object.entries(errorTree.properties ?? {}).map(([field, fieldError]) => [
      field,
      fieldError?.errors ?? [],
    ]),
  );
}
