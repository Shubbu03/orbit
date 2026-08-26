import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import type { CommentService } from "../services/comments";

const commentParamsSchema = z
  .object({
    commentId: z.uuid(),
  })
  .strict();

const createCommentBodySchema = z
  .object({
    content: z.string().trim().min(1).max(5_000),
    issueId: z.uuid(),
  })
  .strict();

const updateCommentBodySchema = createCommentBodySchema.pick({ content: true });

type CommentRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type CommentRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateCommentRoutesOptions = {
  auth: CommentRouteAuth;
  commentService: Pick<CommentService, "create" | "deleteComment" | "update">;
};

export function createCommentRoutes({
  auth,
  commentService,
}: CreateCommentRoutesOptions) {
  const commentRoutes = new Hono<CommentRoutesEnv>();

  commentRoutes.use("*", async (context, next) => {
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

  commentRoutes.post("/comments", async (context) => {
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
    const parsedBody = createCommentBodySchema.safeParse(body);

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

    const createdComment = await commentService.create({
      ...parsedBody.data,
      userId: context.var.userId,
    });

    if (!createdComment) {
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

    return context.json({ comment: createdComment }, 201);
  });

  commentRoutes.put("/comments/:commentId", async (context) => {
    const parsedParams = commentParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid comment ID",
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
    const parsedBody = updateCommentBodySchema.safeParse(body);

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

    const updatedComment = await commentService.update({
      commentId: parsedParams.data.commentId,
      content: parsedBody.data.content,
      userId: context.var.userId,
    });

    if (!updatedComment) {
      return context.json(
        {
          error: {
            code: "COMMENT_NOT_FOUND",
            message: "Comment not found",
          },
        },
        404,
      );
    }

    return context.json({ comment: updatedComment });
  });

  commentRoutes.delete("/comments/:commentId", async (context) => {
    const parsedParams = commentParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid comment ID",
          },
        },
        400,
      );
    }

    const deletedComment = await commentService.deleteComment({
      commentId: parsedParams.data.commentId,
      userId: context.var.userId,
    });

    if (!deletedComment) {
      return context.json(
        {
          error: {
            code: "COMMENT_NOT_FOUND",
            message: "Comment not found",
          },
        },
        404,
      );
    }

    return context.body(null, 204);
  });

  return commentRoutes;
}
