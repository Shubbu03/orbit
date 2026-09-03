import "server-only";

import { z } from "zod";

import { requestServerApi } from "./api/server";

const sessionUserSchema = z
  .object({
    email: z.email(),
    id: z.string().min(1),
    image: z.url().nullable(),
    name: z.string().min(1),
  })
  .passthrough();

const serverSessionSchema = z
  .object({
    session: z.object({ id: z.string().min(1) }).passthrough(),
    user: sessionUserSchema,
  })
  .passthrough()
  .nullable();

export type SessionUser = z.infer<typeof sessionUserSchema>;

export function getServerSession() {
  return requestServerApi(serverSessionSchema, {
    method: "GET",
    url: "/auth/get-session",
  });
}
