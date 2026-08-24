import { Hono } from "hono";
import { cors } from "hono/cors";

export function createApp(trustedOrigin: string) {
  const app = new Hono();

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
      ],
      maxAge: 600,
      origin: trustedOrigin,
    }),
  );

  app.get("/health", (context) => {
    const body = { status: "ok" };
    return context.json(body);
  });
}
