import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import type { AuthModule } from "./lib/auth";
import { createAuthRoutes } from "./routes/auth";
import { createBoardRoutes, type BoardRouteAuth } from "./routes/boards";
import { createCommentRoutes, type CommentRouteAuth } from "./routes/comments";
import { createIssueRoutes, type IssueRouteAuth } from "./routes/issues";
import {
  createOrganisationRoutes,
  type OrganisationRouteAuth,
} from "./routes/organisation";
import { createSectionRoutes, type SectionRouteAuth } from "./routes/sections";
import type { BoardService } from "./services/boards";
import type { CommentService } from "./services/comments";
import type { IssueService } from "./services/issues";
import type { OrganisationService } from "./services/organisation";
import type { SectionService } from "./services/sections";

type CreateAppOptions = {
  auth: Pick<AuthModule, "handler"> &
    BoardRouteAuth &
    CommentRouteAuth &
    IssueRouteAuth &
    OrganisationRouteAuth &
    SectionRouteAuth;
  boardService: Pick<
    BoardService,
    "create" | "deleteBoard" | "listForUser" | "update"
  >;
  commentService: Pick<CommentService, "create" | "deleteComment" | "update">;
  issueService: Pick<
    IssueService,
    "create" | "deleteIssue" | "getById" | "listForUser" | "move" | "update"
  >;
  organisationService: Pick<
    OrganisationService,
    "create" | "deleteOrganisation" | "listForUser"
  >;
  sectionService: Pick<
    SectionService,
    "create" | "deleteSection" | "listForUser" | "update"
  >;
  trustedOrigin: string;
};

export function createApp({
  auth,
  boardService,
  commentService,
  issueService,
  organisationService,
  sectionService,
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
  app.route("/api", createSectionRoutes({ auth, sectionService }));
  app.route("/api", createIssueRoutes({ auth, issueService }));
  app.route("/api", createCommentRoutes({ auth, commentService }));

  return app;
}
