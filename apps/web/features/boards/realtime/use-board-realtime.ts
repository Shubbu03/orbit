"use client";

import {
  boardEventSchema,
  type PresenceUser,
} from "@orbit/contracts/websocket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { issueKeys } from "@/features/issues/api/issues";
import { apiOrigin } from "@/lib/api/origin";

import { boardKeys } from "../api/boards";

type ConnectionState = "connecting" | "live" | "offline";

function boardSocketUrl(boardId: string) {
  const url = new URL(apiOrigin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `/ws/boards/${boardId}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function useBoardRealtime({
  boardId,
  enabled = true,
  onBoardDeleted,
  deferBoardRefresh = false,
}: {
  boardId: string;
  enabled?: boolean;
  deferBoardRefresh?: boolean;
  onBoardDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("connecting");
  const deferred = useRef(deferBoardRefresh);
  useEffect(() => {
    deferred.current = deferBoardRefresh;
  }, [deferBoardRefresh]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!enabled) {
      setConnectionState("connecting");
      setPresence([]);
      return;
    }

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectAttempt = 0;
    let socket: WebSocket | undefined;

    function connect() {
      if (disposed) {
        return;
      }

      setConnectionState("connecting");
      socket = new WebSocket(boardSocketUrl(boardId));

      socket.addEventListener("open", () => {
        reconnectAttempt = 0;
        setConnectionState("live");
        void queryClient.invalidateQueries({
          queryKey: boardKeys.detail(boardId),
          refetchType: deferred.current ? "none" : "active",
        });
      });

      socket.addEventListener("message", (message) => {
        if (typeof message.data !== "string") {
          return;
        }

        let data: unknown;

        try {
          data = JSON.parse(message.data) as unknown;
        } catch {
          return;
        }

        const parsedEvent = boardEventSchema.safeParse(data);

        if (!parsedEvent.success) {
          return;
        }

        const event = parsedEvent.data;

        switch (event.type) {
          case "system.ping":
            socket?.send(JSON.stringify({ type: "system.pong" }));
            return;
          case "presence.snapshot":
            setPresence(event.users);
            return;
          case "presence.joined":
            setPresence((current) => {
              const withoutDuplicate = current.filter(
                (user) => user.id !== event.user.id,
              );
              return [...withoutDuplicate, event.user];
            });
            return;
          case "presence.left":
          case "member.removed":
            setPresence((current) =>
              current.filter((user) => user.id !== event.userId),
            );
            break;
          case "board.deleted":
            onBoardDeleted();
            return;
        }

        void queryClient.invalidateQueries({
          queryKey: boardKeys.detail(boardId),
          refetchType: deferred.current ? "none" : "active",
        });

        if ("issueId" in event) {
          void queryClient.invalidateQueries({
            queryKey: issueKeys.detail(event.issueId),
          });
        } else if ("issue" in event) {
          void queryClient.invalidateQueries({
            queryKey: issueKeys.detail(event.issue.id),
          });
        } else if ("comment" in event) {
          void queryClient.invalidateQueries({
            queryKey: issueKeys.detail(event.comment.issueId),
          });
        }
      });

      socket.addEventListener("close", (event) => {
        if (disposed) {
          return;
        }

        setConnectionState("offline");
        setPresence([]);

        if (event.code === 1008) {
          return;
        }

        reconnectAttempt += 1;
        const delay = Math.min(1_000 * 2 ** (reconnectAttempt - 1), 15_000);
        reconnectTimer = setTimeout(connect, delay);
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [boardId, enabled, onBoardDeleted, queryClient]);

  return { connectionState, presence };
}
