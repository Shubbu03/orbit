import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { AuthModule } from "./lib/auth";
import { createAuthRoutes } from "./routes/auth";
import { createBoardRoutes, type BoardRouteAuth } from "./routes/boards";
import { createIssueRoutes, type IssueRouteAuth } from "./routes/issues";
import {
  createOrganisationRoutes,
  type OrganisationRouteAuth,
} from "./routes/organisation";
import type { BoardService } from "./services/boards";
import type { IssueService } from "./services/issues";
import type { OrganisationService } from "./services/organisation";

type CreateAppOptions = {
  auth: Pick<AuthModule, "handler"> &
    BoardRouteAuth &
    IssueRouteAuth &
    OrganisationRouteAuth;
  boardService: Pick<
    BoardService,
    "create" | "deleteBoard" | "listForUser" | "update"
  >;
  issueService: Pick<
    IssueService,
    "create" | "deleteIssue" | "getById" | "listForUser" | "move" | "update"
  >;
  organisationService: Pick<
    OrganisationService,
    "create" | "deleteOrganisation" | "listForUser"
  >;
  trustedOrigin: string;
};

export function createApp({
  auth,
  boardService,
  issueService,
  organisationService,
  trustedOrigin,
}: CreateAppOptions) {
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
  app.route("/api", createOrganisationRoutes({ auth, organisationService }));
  app.route("/api", createBoardRoutes({ auth, boardService }));
  app.route("/api", createIssueRoutes({ auth, issueService }));

  return app;
}
