import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import type { BoardWebSocketAccess } from "./access";
import type { BoardPresenceRooms } from "./rooms";

const boardParamsSchema = z
  .object({
    boardId: z.uuid(),
  })
  .strict();

export type BoardWebSocketAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateBoardWebSocketRoutesOptions = {
  access: Pick<BoardWebSocketAccess, "getBoardParticipant">;
  auth: BoardWebSocketAuth;
  rooms: Pick<BoardPresenceRooms, "join" | "leave">;
  trustedOrigin: string;
};

export function createBoardWebSocketRoutes({
  access,
  auth,
  rooms,
  trustedOrigin,
}: CreateBoardWebSocketRoutesOptions) {
  const routes = new Hono();

  routes.get("/boards/:boardId", async (context) => {
    if (context.req.header("upgrade")?.toLowerCase() !== "websocket") {
      context.header("Upgrade", "websocket");

      return context.json(
        {
          error: {
            code: "UPGRADE_REQUIRED",
            message: "A WebSocket upgrade is required",
          },
        },
        426,
      );
    }

    if (context.req.header("origin") !== trustedOrigin) {
      return context.json(
        {
          error: {
            code: "ORIGIN_NOT_ALLOWED",
            message: "Origin not allowed",
          },
        },
        403,
      );
    }

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

    const boardId = parsedParams.data.boardId;
    const participant = await access.getBoardParticipant({
      boardId,
      userId: session.user.id,
    });

    if (!participant) {
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

    const connectionId = crypto.randomUUID();

    return upgradeWebSocket(context, {
      onClose: () => {
        rooms.leave({
          boardId,
          connectionId,
          userId: participant.id,
        });
      },
      onMessage: (_event, socket) => {
        socket.close(1008, "Client messages are not supported");
      },
      onOpen: (_event, socket) => {
        rooms.join({
          boardId,
          connectionId,
          socket,
          user: participant,
        });
      },
    });
  });

  return routes;
}
