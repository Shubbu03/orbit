import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import { paginationQueryFields } from "../lib/pagination";
import type { BoardService } from "../services/boards";
import { toBoardPayload } from "../ws/protocol";
import type { BoardEventPublisher } from "../ws/publisher";

const boardParamsSchema = z
  .object({
    boardId: z.uuid(),
  })
  .strict();

const createBoardBodySchema = z
  .object({
    organisationId: z.uuid(),
    title: z.string().trim().min(1).max(100),
  })
  .strict();

const updateBoardBodySchema = z
  .object({
    title: z.string().trim().min(1).max(100),
  })
  .strict();

const listBoardsQuerySchema = z
  .object({
    ...paginationQueryFields,
    organisationId: z.uuid().optional(),
  })
  .strict();

type BoardRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type BoardRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateBoardRoutesOptions = {
  auth: BoardRouteAuth;
  boardService: Pick<
    BoardService,
    "create" | "deleteBoard" | "getById" | "listForUser" | "update"
  >;
  eventPublisher: BoardEventPublisher;
};

export function createBoardRoutes({
  auth,
  boardService,
  eventPublisher,
}: CreateBoardRoutesOptions) {
  const boardRoutes = new Hono<BoardRoutesEnv>();

  boardRoutes.use("*", async (context, next) => {
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

  boardRoutes.post("/boards", async (context) => {
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
    const parsedBody = createBoardBodySchema.safeParse(body);

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

    const createdBoard = await boardService.create({
      ...parsedBody.data,
      userId: context.var.userId,
    });

    if (!createdBoard) {
      return context.json(
        {
          error: {
            code: "ORGANIZATION_NOT_FOUND",
            message: "Organization not found",
          },
        },
        404,
      );
    }

    return context.json({ board: createdBoard }, 201);
  });

  boardRoutes.get("/boards", async (context) => {
    const parsedQuery = listBoardsQuerySchema.safeParse(context.req.query());

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

    const result = await boardService.listForUser({
      ...parsedQuery.data,
      userId: context.var.userId,
    });

    return context.json({ boards: result.items, page: result.page });
  });

  boardRoutes.get("/boards/:boardId", async (context) => {
    const parsedParams = boardParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid board ID",
          },
        },
        400,
      );
    }

    const board = await boardService.getById({
      boardId: parsedParams.data.boardId,
      userId: context.var.userId,
    });

    if (!board) {
      return context.json(
        {
          error: {
            code: "BOARD_NOT_FOUND",
            message: "Board not found",
          },
        },
        404,
      );
    }

    return context.json({ board });
  });

  boardRoutes.put("/boards/:boardId", async (context) => {
    const parsedParams = boardParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid board ID",
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
    const parsedBody = updateBoardBodySchema.safeParse(body);

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

    const updatedBoard = await boardService.update({
      boardId: parsedParams.data.boardId,
      title: parsedBody.data.title,
      userId: context.var.userId,
    });

    if (!updatedBoard) {
      return context.json(
        {
          error: {
            code: "BOARD_NOT_FOUND",
            message: "Board not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "board.updated",
      boardId: updatedBoard.id,
      board: toBoardPayload(updatedBoard),
    });

    return context.json({ board: updatedBoard });
  });

  boardRoutes.delete("/boards/:boardId", async (context) => {
    const parsedParams = boardParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid board ID",
          },
        },
        400,
      );
    }

    const deletedBoard = await boardService.deleteBoard({
      boardId: parsedParams.data.boardId,
      userId: context.var.userId,
    });

    if (!deletedBoard) {
      return context.json(
        {
          error: {
            code: "BOARD_NOT_FOUND",
            message: "Board not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "board.deleted",
      boardId: deletedBoard.id,
    });

    return context.body(null, 204);
  });

  return boardRoutes;
}
