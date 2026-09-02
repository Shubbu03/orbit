import { Hono } from "hono";
import { upgradeWebSocket } from "hono/bun";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import type { BoardWebSocketAccess } from "./access";
import { clientWebSocketMessageSchema } from "./protocol";
import type { BoardPresenceRooms } from "./rooms";

const boardParamsSchema = z
  .object({
    boardId: z.uuid(),
  })
  .strict();

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export type BoardWebSocketAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateBoardWebSocketRoutesOptions = {
  access: Pick<BoardWebSocketAccess, "getBoardParticipant">;
  auth: BoardWebSocketAuth;
  rooms: Pick<BoardPresenceRooms, "join" | "leave" | "touch">;
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
      onMessage: (event, socket) => {
        if (typeof event.data !== "string") {
          socket.close(1008, "Invalid client message");
          return;
        }

        const data = parseJson(event.data);
        const parsedMessage = clientWebSocketMessageSchema.safeParse(data);

        if (!parsedMessage.success) {
          socket.close(1008, "Invalid client message");
          return;
        }

        const touched = rooms.touch({
          boardId,
          connectionId,
          userId: participant.id,
        });

        if (!touched) {
          socket.close(1008, "Connection is no longer registered");
        }
      },
      onOpen: (_event, socket) => {
        const result = rooms.join({
          boardId,
          connectionId,
          socket,
          user: participant,
        });

        if (result.status === "board_full") {
          socket.close(1013, "Board connection limit reached");
        } else if (result.status === "user_limit_reached") {
          socket.close(1008, "User connection limit reached");
        }
      },
    });
  });

  return routes;
}
