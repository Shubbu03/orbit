import {
  serializePresenceEvent,
  type PresenceEvent,
  type PresenceUser,
} from "./protocol";

export type PresenceSocket = {
  send: (data: string) => void;
};

type Participant = {
  connections: Map<string, PresenceSocket>;
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

function send(socket: PresenceSocket, event: PresenceEvent) {
  try {
    socket.send(serializePresenceEvent(event));
    return true;
  } catch {
    return false;
  }
}

export function createBoardPresenceRooms() {
  const rooms = new Map<string, Map<string, Participant>>();

  const broadcast = (
    room: Map<string, Participant>,
    event: PresenceEvent,
    excludedConnectionId?: string,
  ) => {
    for (const participant of room.values()) {
      for (const [connectionId, socket] of participant.connections) {
        if (connectionId !== excludedConnectionId) {
          send(socket, event);
        }
      }
    }
  };

  return {
    join: ({ boardId, connectionId, socket, user }: JoinRoomInput) => {
      let room = rooms.get(boardId);

      if (!room) {
        room = new Map();
        rooms.set(boardId, room);
      }

      let participant = room.get(user.id);
      const isFirstConnection = !participant;

      if (!participant) {
        participant = {
          connections: new Map(),
          user,
        };
        room.set(user.id, participant);
      } else {
        participant.user = user;
      }

      participant.connections.set(connectionId, socket);

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

      send(socket, {
        type: "presence.snapshot",
        boardId,
        users: [...room.values()].map(({ user: roomUser }) => roomUser),
      });
    },

    leave: ({ boardId, connectionId, userId }: LeaveRoomInput) => {
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
    },
  };
}

export type BoardPresenceRooms = ReturnType<typeof createBoardPresenceRooms>;
