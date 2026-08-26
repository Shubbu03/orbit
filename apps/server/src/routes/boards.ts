import { Hono } from "hono";
import { z } from "zod";

import type { BoardService } from "../services/boards";

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

function getFieldErrors<T extends Record<string, unknown>>(error: z.ZodError<T>) {
  const errorTree = z.treeifyError(error);

  return Object.fromEntries(
    Object.entries(errorTree.properties ?? {}).map(([field, fieldError]) => [
      field,
      fieldError?.errors ?? [],
    ]),
  );
}

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
    "create" | "deleteBoard" | "listForUser" | "update"
  >;
};

export function createBoardRoutes({
  auth,
  boardService,
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
    const userBoards = await boardService.listForUser({
      userId: context.var.userId,
    });

    return context.json({ boards: userBoards });
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

    return context.body(null, 204);
  });

  return boardRoutes;
}
