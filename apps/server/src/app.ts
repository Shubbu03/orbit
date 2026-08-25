import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { AuthModule } from "./lib/auth";
import { createAuthRoutes } from "./routes/auth";

type CreateAppOptions = {
  auth: Pick<AuthModule, "handler">;
  trustedOrigin: string;
};

export function createApp({ auth, trustedOrigin }: CreateAppOptions) {
  const app = new Hono();

  app.use("*", secureHeaders());

  app.use(
    "/api/*",
    cors({
      allowHeaders: ["Authorization", "Content-Type"],
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      credentials: true,
      exposeHeaders: [
        "RateLimit-Limit",
        "RateLimit-Remaining",
        "RateLimit-Reset",
        "Retry-After",
        "Server-Timing",
        "X-Request-Id",
        "X-Retry-After",
      ],
      maxAge: 600,
      origin: trustedOrigin,
    }),
  );

  app.get("/health", (context) => {
    return context.json({ status: "ok" });
  });

  app.route("/api/auth", createAuthRoutes(auth));

  return app;
}
