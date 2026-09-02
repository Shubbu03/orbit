import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import { paginationQueryFields } from "../lib/pagination";
import type { IssueService } from "../services/issues";
import { toIssuePayload } from "../ws/protocol";
import type { BoardEventPublisher } from "../ws/publisher";

const issueParamsSchema = z
  .object({
    issueId: z.uuid(),
  })
  .strict();

const createIssueBodySchema = z
  .object({
    boardId: z.uuid(),
    description: z.string().trim().min(1).max(5_000),
    sectionId: z.uuid(),
    title: z.string().trim().min(1).max(200),
  })
  .strict();

const updateIssueBodySchema = createIssueBodySchema.pick({
  description: true,
  title: true,
});

const moveIssueBodySchema = createIssueBodySchema
  .pick({
    sectionId: true,
  })
  .extend({
    position: z.number().int().min(0),
  });

const listIssuesQuerySchema = z
  .object({
    boardId: z.uuid().optional(),
    ...paginationQueryFields,
  })
  .strict();

const issueCommentsQuerySchema = z.object(paginationQueryFields).strict();

type IssueRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type IssueRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateIssueRoutesOptions = {
  auth: IssueRouteAuth;
  eventPublisher: BoardEventPublisher;
  issueService: Pick<
    IssueService,
    "create" | "deleteIssue" | "getById" | "listForUser" | "move" | "update"
  >;
};

export function createIssueRoutes({
  auth,
  eventPublisher,
  issueService,
}: CreateIssueRoutesOptions) {
  const issueRoutes = new Hono<IssueRoutesEnv>();

  issueRoutes.use("*", async (context, next) => {
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

  issueRoutes.post("/issues", async (context) => {
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
    const parsedBody = createIssueBodySchema.safeParse(body);

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

    const createdIssue = await issueService.create({
      ...parsedBody.data,
      userId: context.var.userId,
    });

    if (!createdIssue) {
      return context.json(
        {
          error: {
            code: "BOARD_NOT_FOUND",
            message: "Board or section not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "issue.created",
      boardId: createdIssue.boardId,
      issue: toIssuePayload(createdIssue),
    });

    return context.json({ issue: createdIssue }, 201);
  });

  issueRoutes.get("/issues", async (context) => {
    const parsedQuery = listIssuesQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedQuery.error),
            message: "Invalid query parameters",
          },
        },
        400,
      );
    }

    const userIssues = await issueService.listForUser({
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
      ...(parsedQuery.data.boardId
        ? { boardId: parsedQuery.data.boardId }
        : {}),
      userId: context.var.userId,
    });

    return context.json({ issues: userIssues.items, page: userIssues.page });
  });

  issueRoutes.get("/issues/:issueId", async (context) => {
    const parsedParams = issueParamsSchema.safeParse(context.req.param());
    const parsedQuery = issueCommentsQuerySchema.safeParse(context.req.query());

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

    if (!parsedQuery.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedQuery.error),
            message: "Invalid query parameters",
          },
        },
        400,
      );
    }

    const issue = await issueService.getById({
      ...parsedQuery.data,
      issueId: parsedParams.data.issueId,
      userId: context.var.userId,
    });

    if (!issue) {
      return context.json(
        {
          error: {
            code: "ISSUE_NOT_FOUND",
            message: "Issue not found",
          },
        },
        404,
      );
    }

    return context.json({ issue });
  });

  issueRoutes.put("/issues/:issueId", async (context) => {
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
    const parsedBody = updateIssueBodySchema.safeParse(body);

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

    const updatedIssue = await issueService.update({
      ...parsedBody.data,
      issueId: parsedParams.data.issueId,
      userId: context.var.userId,
    });

    if (!updatedIssue) {
      return context.json(
        {
          error: {
            code: "ISSUE_NOT_FOUND",
            message: "Issue not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "issue.updated",
      boardId: updatedIssue.boardId,
      issue: toIssuePayload(updatedIssue),
    });

    return context.json({ issue: updatedIssue });
  });

  issueRoutes.put("/issues/:issueId/move", async (context) => {
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
    const parsedBody = moveIssueBodySchema.safeParse(body);

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

    const movedIssue = await issueService.move({
      issueId: parsedParams.data.issueId,
      position: parsedBody.data.position,
      sectionId: parsedBody.data.sectionId,
      userId: context.var.userId,
    });

    if (!movedIssue) {
      return context.json(
        {
          error: {
            code: "ISSUE_NOT_FOUND",
            message: "Issue or target section not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "issue.moved",
      boardId: movedIssue.boardId,
      issueId: movedIssue.id,
      position: movedIssue.position,
      sectionId: movedIssue.sectionId,
      updatedAt: movedIssue.updatedAt.toISOString(),
    });

    return context.json({ issue: movedIssue });
  });

  issueRoutes.delete("/issues/:issueId", async (context) => {
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

    const deletedIssue = await issueService.deleteIssue({
      issueId: parsedParams.data.issueId,
      userId: context.var.userId,
    });

    if (!deletedIssue) {
      return context.json(
        {
          error: {
            code: "ISSUE_NOT_FOUND",
            message: "Issue not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "issue.deleted",
      boardId: deletedIssue.boardId,
      issueId: deletedIssue.id,
    });

    return context.body(null, 204);
  });

  return issueRoutes;
}
