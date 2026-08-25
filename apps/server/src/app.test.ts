import { describe, expect, test } from "bun:test";

import type { AuthModule } from "./lib/auth";
import { createApp } from "./app";

const trustedOrigin = "http://localhost:3000";
const auth: Pick<AuthModule, "handler"> = {
  handler: (request) =>
    Promise.resolve(
      Response.json({
        method: request.method,
        path: new URL(request.url).pathname,
      }),
    ),
};

describe("createApp", () => {
  test("forwards auth requests to Better Auth", async () => {
    const app = createApp({ auth, trustedOrigin });
    const response = await app.request(
      "http://localhost:3001/api/auth/get-session",
      {
        headers: { origin: trustedOrigin },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      method: "GET",
      path: "/api/auth/get-session",
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      trustedOrigin,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });

  test("answers auth preflight requests before the handler", async () => {
    const app = createApp({ auth, trustedOrigin });
    const response = await app.request(
      "http://localhost:3001/api/auth/sign-in/social",
      {
        method: "OPTIONS",
        headers: {
          "access-control-request-headers": "content-type",
          "access-control-request-method": "POST",
          origin: trustedOrigin,
        },
      },
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      trustedOrigin,
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );
  });

  test("adds baseline security headers", async () => {
    const app = createApp({ auth, trustedOrigin });
    const response = await app.request("http://localhost:3001/health");

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  });
});
