import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";

import type { AuthModule } from "./lib/auth";
import type { Logger } from "./lib/logger";
import type { RateLimiter } from "./lib/rate-limit";
import {
  createAssigneeRoutes,
  type AssigneeRouteAuth,
} from "./routes/assignees";
import { createAuthRoutes } from "./routes/auth";
import { createBoardRoutes, type BoardRouteAuth } from "./routes/boards";
import { createCommentRoutes, type CommentRouteAuth } from "./routes/comments";
import { createInviteRoutes, type InviteRouteAuth } from "./routes/invite";
import { createIssueRoutes, type IssueRouteAuth } from "./routes/issues";
import {
  createMembershipRoutes,
  type MembershipRouteAuth,
} from "./routes/membership";
import {
  createOrganisationRoutes,
  type OrganisationRouteAuth,
} from "./routes/organisation";
import { createSectionRoutes, type SectionRouteAuth } from "./routes/sections";
import type { BoardService } from "./services/boards";
import type { AssigneeService } from "./services/assignees";
import type { CommentService } from "./services/comments";
import type { InviteService } from "./services/invite";
import type { IssueService } from "./services/issues";
import type { MembershipService } from "./services/membership";
import type { OrganisationService } from "./services/organisation";
import type { SectionService } from "./services/sections";
import type { BoardWebSocketAccess } from "./ws/access";
import { createBoardWebSocketRoutes, type BoardWebSocketAuth } from "./ws";
import type { BoardEventPublisher } from "./ws/publisher";
import type { BoardPresenceRooms } from "./ws/rooms";

type CreateAppOptions = {
  auth: Pick<AuthModule, "handler"> &
    AssigneeRouteAuth &
    BoardRouteAuth &
    CommentRouteAuth &
    InviteRouteAuth &
    IssueRouteAuth &
    MembershipRouteAuth &
    OrganisationRouteAuth &
    SectionRouteAuth &
    BoardWebSocketAuth;
  boardEventPublisher: BoardEventPublisher;
  assigneeService: Pick<AssigneeService, "assign" | "unassign">;
  boardService: Pick<
    BoardService,
    "create" | "deleteBoard" | "getById" | "listForUser" | "update"
  >;
  commentService: Pick<
    CommentService,
    "create" | "deleteComment" | "listForIssue" | "update"
  >;
  inviteService: Pick<InviteService, "accept" | "invite">;
  issueService: Pick<
    IssueService,
    "create" | "deleteIssue" | "getById" | "listForUser" | "move" | "update"
  >;
  organisationService: Pick<
    OrganisationService,
    "create" | "deleteOrganisation" | "getById" | "listForUser"
  >;
  membershipService: Pick<MembershipService, "listForUser" | "remove">;
  logger: Logger;
  rateLimiter: Pick<RateLimiter, "consume">;
  trustProxy: boolean;
  sectionService: Pick<
    SectionService,
    "create" | "deleteSection" | "listForUser" | "move" | "update"
  >;
  trustedOrigin: string;
  webSocketAccess: Pick<BoardWebSocketAccess, "getBoardParticipant">;
  webSocketRooms: Pick<BoardPresenceRooms, "join" | "leave" | "touch">;
};

export function createApp({
  auth,
  assigneeService,
  boardEventPublisher,
  boardService,
  commentService,
  inviteService,
  issueService,
  logger,
  membershipService,
  organisationService,
  sectionService,
  rateLimiter,
  trustProxy,
  trustedOrigin,
  webSocketAccess,
  webSocketRooms,
}: CreateAppOptions) {
  const app = new Hono();

  app.use("*", requestId());
  app.use("*", secureHeaders());

  app.use("/api/*", async (context, next) => {
    const startedAt = performance.now();
    await next();
    logger.info("HTTP request", {
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      method: context.req.method,
      path: context.req.path,
      requestId: context.get("requestId"),
      status: context.res.status,
    });
  });

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

  app.use(
    "/api/*",
    bodyLimit({
      maxSize: 256 * 1024,
      onError: (context) =>
        context.json(
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "Request body exceeds 256 KiB",
            },
          },
          413,
        ),
    }),
  );

  app.use("/api/*", async (context, next) => {
    if (
      context.req.path === "/api/auth" ||
      context.req.path.startsWith("/api/auth/")
    ) {
      await next();
      return;
    }

    const forwardedAddress = trustProxy
      ? (context.req.header("cf-connecting-ip") ??
        context.req.header("x-real-ip") ??
        context.req.header("x-forwarded-for")?.split(",")[0]?.trim())
      : undefined;
    const identity =
      context.req.header("authorization") ??
      context.req.header("cookie") ??
      forwardedAddress ??
      "anonymous";
    const identityHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(identity),
        ),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const result = await rateLimiter.consume(identityHash);
    const resetSeconds = Math.max(1, Math.ceil(result.resetAfterMs / 1_000));

    context.header("RateLimit-Limit", String(result.limit));
    context.header("RateLimit-Remaining", String(result.remaining));
    context.header("RateLimit-Reset", String(resetSeconds));

    if (!result.allowed) {
      context.header("Retry-After", String(resetSeconds));
      return context.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests",
          },
        },
        429,
      );
    }

    await next();
  });

  app.route(
    "/ws",
    createBoardWebSocketRoutes({
      access: webSocketAccess,
      auth,
      rooms: webSocketRooms,
      trustedOrigin,
    }),
  );

  app.get("/health", (context) => {
    return context.json({ status: "ok" });
  });

  app.route("/api/auth", createAuthRoutes(auth));
  app.route(
    "/api",
    createAssigneeRoutes({
      assigneeService,
      auth,
      eventPublisher: boardEventPublisher,
    }),
  );
  app.route(
    "/api",
    createOrganisationRoutes({
      auth,
      eventPublisher: boardEventPublisher,
      organisationService,
    }),
  );
  app.route(
    "/api",
    createBoardRoutes({
      auth,
      boardService,
      eventPublisher: boardEventPublisher,
    }),
  );
  app.route(
    "/api",
    createSectionRoutes({
      auth,
      eventPublisher: boardEventPublisher,
      sectionService,
    }),
  );
  app.route(
    "/api",
    createIssueRoutes({
      auth,
      eventPublisher: boardEventPublisher,
      issueService,
    }),
  );
  app.route(
    "/api",
    createCommentRoutes({
      auth,
      commentService,
      eventPublisher: boardEventPublisher,
    }),
  );
  app.route(
    "/api",
    createInviteRoutes({
      auth,
      eventPublisher: boardEventPublisher,
      inviteService,
    }),
  );
  app.route(
    "/api",
    createMembershipRoutes({
      auth,
      eventPublisher: boardEventPublisher,
      membershipService,
    }),
  );

  app.notFound((context) =>
    context.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "Route not found",
        },
      },
      404,
    ),
  );

  app.onError((error, context) => {
    logger.error("Unhandled request error", {
      error: error.message,
      method: context.req.method,
      path: context.req.path,
      requestId: context.get("requestId"),
    });

    return context.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      500,
    );
  });

  return app;
}
