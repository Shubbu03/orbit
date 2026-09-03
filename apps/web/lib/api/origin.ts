import { z } from "zod";

const apiOriginSchema = z
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
  }, "NEXT_PUBLIC_API_ORIGIN must be an HTTP(S) origin")
  .transform((value) => new URL(value).origin);

export const apiOrigin = apiOriginSchema.parse(
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001",
);
