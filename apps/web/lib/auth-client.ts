import { createAuthClient } from "better-auth/react";

const configuredApiOrigin =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:3001";
const apiOrigin = new URL(configuredApiOrigin);

if (
  (apiOrigin.protocol !== "http:" && apiOrigin.protocol !== "https:") ||
  apiOrigin.username !== "" ||
  apiOrigin.password !== "" ||
  apiOrigin.pathname !== "/" ||
  apiOrigin.search !== "" ||
  apiOrigin.hash !== ""
) {
  throw new Error("NEXT_PUBLIC_API_ORIGIN must be an HTTP(S) origin");
}

export const authClient = createAuthClient({
  baseURL: apiOrigin.origin,
});
