import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import type { AssigneeService } from "../services/assignees";
import type { BoardEventPublisher } from "../ws/publisher";

const issueParamsSchema = z
  .object({
    issueId: z.uuid(),
  })
  .strict();

const assigneeParamsSchema = issueParamsSchema
  .extend({
    userId: z.string().trim().min(1).max(255),
  })
  .strict();

const assignIssueBodySchema = z
  .object({
    userId: z.string().trim().min(1).max(255),
  })
  .strict();

type AssigneeRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type AssigneeRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateAssigneeRoutesOptions = {
  assigneeService: Pick<AssigneeService, "assign" | "unassign">;
  auth: AssigneeRouteAuth;
  eventPublisher: BoardEventPublisher;
};

export function createAssigneeRoutes({
  assigneeService,
  auth,
  eventPublisher,
}: CreateAssigneeRoutesOptions) {
  const routes = new Hono<AssigneeRoutesEnv>();

  routes.use("*", async (context, next) => {
    const session = await auth.getSession(context.req.raw.headers);

    if (!session) {
      return context.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        401,
      );
    }

    context.set("userId", session.user.id);
    await next();
  });

  routes.post("/issues/:issueId/assignees", async (context) => {
    const parsedParams = issueParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid issue ID",
          },
        },
        400,
      );
    }

    const contentType = context.req.header("content-type");

    if (!contentType?.toLowerCase().startsWith("application/json")) {
      return context.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }

    const body: unknown = await context.req.json().catch(() => null);
    const parsedBody = assignIssueBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedBody.error),
            message: "Invalid request body",
          },
        },
        400,
      );
    }

    const result = await assigneeService.assign({
      issueId: parsedParams.data.issueId,
      targetUserId: parsedBody.data.userId,
      userId: context.var.userId,
    });

    if (result.status === "not_found") {
      return context.json(
        {
          error: {
            code: "ASSIGNEE_NOT_FOUND",
            message: "Issue or organization member not found",
          },
        },
        404,
      );
    }

    if (result.status === "assigned") {
      eventPublisher.publish({
        type: "assignee.assigned",
        boardId: result.boardId,
        issueId: result.assignment.issueId,
        user: result.assignment.user,
      });
    }

    return context.json(
      { assignment: result.assignment },
      result.status === "assigned" ? 201 : 200,
    );
  });

  routes.delete("/issues/:issueId/assignees/:userId", async (context) => {
    const parsedParams = assigneeParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid issue or user ID",
          },
        },
        400,
      );
    }

    const removedAssignment = await assigneeService.unassign({
      issueId: parsedParams.data.issueId,
      targetUserId: parsedParams.data.userId,
      userId: context.var.userId,
    });

    if (!removedAssignment) {
      return context.json(
        {
          error: {
            code: "ASSIGNMENT_NOT_FOUND",
            message: "Issue assignment not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "assignee.unassigned",
      ...removedAssignment,
    });

    return context.body(null, 204);
  });

  return routes;
}
