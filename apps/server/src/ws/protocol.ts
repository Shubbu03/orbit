export type PresenceUser = {
  id: string;
  image: string | null;
  name: string;
};

export type PresenceSnapshotEvent = {
  type: "presence.snapshot";
  boardId: string;
  users: PresenceUser[];
};

export type PresenceJoinedEvent = {
  type: "presence.joined";
  boardId: string;
  user: PresenceUser;
};

export type PresenceLeftEvent = {
  type: "presence.left";
  boardId: string;
  userId: string;
};

export type PresenceEvent =
  | PresenceSnapshotEvent
  | PresenceJoinedEvent
  | PresenceLeftEvent;

export function serializePresenceEvent(event: PresenceEvent) {
  return JSON.stringify(event);
}
