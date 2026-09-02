import { config } from "dotenv";
import { z } from "zod";

config({ path: new URL("./.env", import.meta.url), quiet: true });

const originSchema = z
  .url()
  .refine((value) => {
    const url = new URL(value);

    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  }, "Must be an HTTP(S) origin without a path, credentials, query, or hash")
  .transform((value) => new URL(value).origin);

const redisUrlSchema = z.url().refine((value) => {
  const protocol = new URL(value).protocol;

  return protocol === "redis:" || protocol === "rediss:";
}, "Must use the redis or rediss protocol");

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    API_ORIGIN: originSchema.default("http://localhost:3001"),
    TRUSTED_ORIGIN: originSchema.default("http://localhost:3000"),
    REDIS_URL: redisUrlSchema.optional(),
    API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
    API_RATE_LIMIT_WINDOW_MS: z.coerce
      .number()
      .int()
      .min(1_000)
      .default(60_000),
    TRUST_PROXY: z.stringbool().default(false),
    WS_HEARTBEAT_INTERVAL_MS: z.coerce
      .number()
      .int()
      .min(5_000)
      .default(30_000),
    WS_IDLE_TIMEOUT_MS: z.coerce.number().int().min(10_000).default(90_000),
    WS_MAX_CONNECTIONS_PER_BOARD: z.coerce.number().int().min(1).default(500),
    WS_MAX_CONNECTIONS_PER_USER: z.coerce.number().int().min(1).default(5),
    GOOGLE_CLIENT_ID: z.string().trim().min(1),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
    if (value.WS_IDLE_TIMEOUT_MS <= value.WS_HEARTBEAT_INTERVAL_MS) {
      context.addIssue({
        code: "custom",
        message: "Must be greater than WS_HEARTBEAT_INTERVAL_MS",
        path: ["WS_IDLE_TIMEOUT_MS"],
      });
    }

    if (value.NODE_ENV !== "production") {
      return;
    }

    for (const key of ["API_ORIGIN", "TRUSTED_ORIGIN"] as const) {
      if (!value[key].startsWith("https://")) {
        context.addIssue({
          code: "custom",
          message: "Must use HTTPS in production",
          path: [key],
        });
      }
    }
  });

export const env = envSchema.parse(process.env);
