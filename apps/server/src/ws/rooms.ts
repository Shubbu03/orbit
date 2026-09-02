import {
  serializeBoardEvent,
  type BoardEvent,
  type PresenceUser,
} from "./protocol";

export type PresenceSocket = {
  close: (code?: number, reason?: string) => void;
  send: (data: string) => void;
};

type Connection = {
  lastSeenAt: number;
  socket: PresenceSocket;
};

type Participant = {
  connections: Map<string, Connection>;
  user: PresenceUser;
};

type JoinRoomInput = {
  boardId: string;
  connectionId: string;
  socket: PresenceSocket;
  user: PresenceUser;
};

type LeaveRoomInput = {
  boardId: string;
  connectionId: string;
  userId: string;
};

type BoardPresenceRoomOptions = {
  idleTimeoutMs: number;
  maxConnectionsPerBoard: number;
  maxConnectionsPerUser: number;
  now?: () => number;
};

export type JoinRoomResult =
  { status: "joined" } | { status: "board_full" | "user_limit_reached" };

function send(socket: PresenceSocket, event: BoardEvent) {
  try {
    socket.send(serializeBoardEvent(event));
    return true;
  } catch {
    return false;
  }
}

export function createBoardPresenceRooms({
  idleTimeoutMs,
  maxConnectionsPerBoard,
  maxConnectionsPerUser,
  now = Date.now,
}: BoardPresenceRoomOptions) {
  const rooms = new Map<string, Map<string, Participant>>();

  const broadcast = (
    room: Map<string, Participant>,
    event: BoardEvent,
    excludedConnectionId?: string,
  ) => {
    for (const participant of room.values()) {
      for (const [connectionId, connection] of participant.connections) {
        if (connectionId !== excludedConnectionId) {
          send(connection.socket, event);
        }
      }
    }
  };

  const leave = ({ boardId, connectionId, userId }: LeaveRoomInput) => {
    const room = rooms.get(boardId);
    const participant = room?.get(userId);

    if (!room || !participant) {
      return;
    }

    participant.connections.delete(connectionId);

    if (participant.connections.size > 0) {
      return;
    }

    room.delete(userId);

    if (room.size === 0) {
      rooms.delete(boardId);
      return;
    }

    broadcast(room, {
      type: "presence.left",
      boardId,
      userId,
    });
  };

  return {
    closeBoard: (boardId: string) => {
      const room = rooms.get(boardId);

      if (!room) {
        return;
      }

      rooms.delete(boardId);

      for (const participant of room.values()) {
        for (const connection of participant.connections.values()) {
          connection.socket.close(1001, "Board is no longer available");
        }
      }
    },

    disconnectUser: ({
      boardIds,
      userId,
    }: {
      boardIds: string[];
      userId: string;
    }) => {
      for (const boardId of boardIds) {
        const participant = rooms.get(boardId)?.get(userId);

        if (!participant) {
          continue;
        }

        const connections = [...participant.connections.entries()];

        for (const [connectionId, connection] of connections) {
          connection.socket.close(1008, "Board membership was revoked");
          leave({ boardId, connectionId, userId });
        }
      }
    },

    join: ({
      boardId,
      connectionId,
      socket,
      user,
    }: JoinRoomInput): JoinRoomResult => {
      let room = rooms.get(boardId);

      if (!room) {
        room = new Map();
        rooms.set(boardId, room);
      }

      const connectionCount = [...room.values()].reduce(
        (total, participant) => total + participant.connections.size,
        0,
      );

      if (connectionCount >= maxConnectionsPerBoard) {
        if (room.size === 0) {
          rooms.delete(boardId);
        }

        return { status: "board_full" };
      }

      let participant = room.get(user.id);
      const isFirstConnection = !participant;

      if (participant?.connections.size === maxConnectionsPerUser) {
        return { status: "user_limit_reached" };
      }

      if (!participant) {
        participant = {
          connections: new Map(),
          user,
        };
        room.set(user.id, participant);
      } else {
        participant.user = user;
      }

      participant.connections.set(connectionId, {
        lastSeenAt: now(),
        socket,
      });

      if (isFirstConnection) {
        broadcast(
          room,
          {
            type: "presence.joined",
            boardId,
            user,
          },
          connectionId,
        );
      }

      const snapshotSent = send(socket, {
        type: "presence.snapshot",
        boardId,
        users: [...room.values()].map(({ user: roomUser }) => roomUser),
      });

      if (!snapshotSent) {
        leave({ boardId, connectionId, userId: user.id });
        socket.close(1011, "Presence synchronization failed");
      }

      return { status: "joined" };
    },

    leave,

    publish: (event: BoardEvent) => {
      const room = rooms.get(event.boardId);

      if (room) {
        broadcast(room, event);
      }
    },

    sweep: () => {
      const currentTime = now();

      for (const [boardId, room] of [...rooms]) {
        for (const [userId, participant] of [...room]) {
          for (const [connectionId, connection] of [
            ...participant.connections,
          ]) {
            if (currentTime - connection.lastSeenAt >= idleTimeoutMs) {
              connection.socket.close(1001, "Connection timed out");
              leave({ boardId, connectionId, userId });
              continue;
            }

            const pingSent = send(connection.socket, {
              type: "system.ping",
              boardId,
              sentAt: new Date(currentTime).toISOString(),
            });

            if (!pingSent) {
              connection.socket.close(1011, "Heartbeat failed");
              leave({ boardId, connectionId, userId });
            }
          }
        }
      }
    },

    touch: ({ boardId, connectionId, userId }: LeaveRoomInput) => {
      const connection = rooms
        .get(boardId)
        ?.get(userId)
        ?.connections.get(connectionId);

      if (!connection) {
        return false;
      }

      connection.lastSeenAt = now();
      return true;
    },
  };
}

export type BoardPresenceRooms = ReturnType<typeof createBoardPresenceRooms>;
