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
    GOOGLE_CLIENT_ID: z.string().trim().min(1),
    GOOGLE_CLIENT_SECRET: z.string().trim().min(1),
  })
  .superRefine((value, context) => {
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
