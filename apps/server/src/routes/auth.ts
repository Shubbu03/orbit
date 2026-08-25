import { Hono } from "hono";

import type { AuthModule } from "../lib/auth";

export function createAuthRoutes(auth: Pick<AuthModule, "handler">) {
  const authRoutes = new Hono();

  authRoutes.all("*", async (c) => {
    return auth.handler(c.req.raw);
  });

  return authRoutes;
}
