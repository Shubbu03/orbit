import { z } from "zod";

export const clientWebSocketMessageSchema = z
  .object({
    type: z.literal("system.pong"),
  })
  .strict();

export type PresenceUser = {
  id: string;
  image: string | null;
  name: string;
};

export type BoardPayload = {
  id: string;
  organisationId: string;
  title: string;
  updatedAt: string;
};

export type SectionPayload = {
  boardId: string;
  id: string;
  position: number;
  title: string;
  updatedAt: string;
};

export type IssuePayload = {
  boardId: string;
  description: string;
  id: string;
  position: number;
  sectionId: string;
  title: string;
  updatedAt: string;
};

export type CommentPayload = {
  author: PresenceUser;
  content: string;
  createdAt: string;
  id: string;
  issueId: string;
  updatedAt: string;
  userId: string;
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

export type IssueMovedEvent = {
  type: "issue.moved";
  boardId: string;
  issueId: string;
  position: number;
  sectionId: string;
  updatedAt: string;
};

export type BoardUpdatedEvent = {
  type: "board.updated";
  boardId: string;
  board: BoardPayload;
};

export type BoardDeletedEvent = {
  type: "board.deleted";
  boardId: string;
};

export type IssueCreatedEvent = {
  type: "issue.created";
  boardId: string;
  issue: IssuePayload;
};

export type IssueUpdatedEvent = {
  type: "issue.updated";
  boardId: string;
  issue: IssuePayload;
};

export type IssueDeletedEvent = {
  type: "issue.deleted";
  boardId: string;
  issueId: string;
};

export type SectionCreatedEvent = {
  type: "section.created";
  boardId: string;
  section: SectionPayload;
};

export type SectionUpdatedEvent = {
  type: "section.updated";
  boardId: string;
  section: SectionPayload;
};

export type SectionMovedEvent = {
  type: "section.moved";
  boardId: string;
  sectionId: string;
  position: number;
  updatedAt: string;
};

export type SectionDeletedEvent = {
  type: "section.deleted";
  boardId: string;
  sectionId: string;
};

export type CommentCreatedEvent = {
  type: "comment.created";
  boardId: string;
  comment: CommentPayload;
};

export type CommentUpdatedEvent = {
  type: "comment.updated";
  boardId: string;
  comment: CommentPayload;
};

export type CommentDeletedEvent = {
  type: "comment.deleted";
  boardId: string;
  commentId: string;
  issueId: string;
};

export type MemberRemovedEvent = {
  type: "member.removed";
  boardId: string;
  userId: string;
};

export type MemberAddedEvent = {
  type: "member.added";
  boardId: string;
  role: "admin" | "member";
  user: PresenceUser;
};

export type SystemPingEvent = {
  type: "system.ping";
  boardId: string;
  sentAt: string;
};

export type AssigneeAssignedEvent = {
  type: "assignee.assigned";
  boardId: string;
  issueId: string;
  user: PresenceUser;
};

export type AssigneeUnassignedEvent = {
  type: "assignee.unassigned";
  boardId: string;
  issueId: string;
  userId: string;
};

export type PresenceEvent =
  PresenceSnapshotEvent | PresenceJoinedEvent | PresenceLeftEvent;

export type BoardEvent =
  | PresenceEvent
  | BoardUpdatedEvent
  | BoardDeletedEvent
  | IssueCreatedEvent
  | IssueUpdatedEvent
  | IssueMovedEvent
  | IssueDeletedEvent
  | SectionCreatedEvent
  | SectionUpdatedEvent
  | SectionMovedEvent
  | SectionDeletedEvent
  | CommentCreatedEvent
  | CommentUpdatedEvent
  | CommentDeletedEvent
  | AssigneeAssignedEvent
  | AssigneeUnassignedEvent
  | MemberAddedEvent
  | MemberRemovedEvent
  | SystemPingEvent;

export type PublishedBoardEvent = Exclude<
  BoardEvent,
  PresenceEvent | SystemPingEvent
>;

const presenceUserSchema = z.object({
  id: z.string().min(1).max(255),
  image: z.url().nullable(),
  name: z.string().min(1).max(255),
});

const boardPayloadSchema = z.object({
  id: z.uuid(),
  organisationId: z.uuid(),
  title: z.string().min(1).max(100),
  updatedAt: z.iso.datetime(),
});

const sectionPayloadSchema = z.object({
  boardId: z.uuid(),
  id: z.uuid(),
  position: z.number().int().min(0),
  title: z.string().min(1).max(100),
  updatedAt: z.iso.datetime(),
});

const issuePayloadSchema = z.object({
  boardId: z.uuid(),
  description: z.string().max(5_000),
  id: z.uuid(),
  position: z.number().int().min(0),
  sectionId: z.uuid(),
  title: z.string().min(1).max(200),
  updatedAt: z.iso.datetime(),
});

const commentPayloadSchema = z.object({
  author: presenceUserSchema,
  content: z.string().min(1).max(5_000),
  createdAt: z.iso.datetime(),
  id: z.uuid(),
  issueId: z.uuid(),
  updatedAt: z.iso.datetime(),
  userId: z.string().min(1).max(255),
});

export const publishedBoardEventSchema: z.ZodType<PublishedBoardEvent> =
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("board.updated"),
      boardId: z.uuid(),
      board: boardPayloadSchema,
    }),
    z.object({ type: z.literal("board.deleted"), boardId: z.uuid() }),
    z.object({
      type: z.literal("issue.created"),
      boardId: z.uuid(),
      issue: issuePayloadSchema,
    }),
    z.object({
      type: z.literal("issue.updated"),
      boardId: z.uuid(),
      issue: issuePayloadSchema,
    }),
    z.object({
      type: z.literal("issue.moved"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      position: z.number().int().min(0),
      sectionId: z.uuid(),
      updatedAt: z.iso.datetime(),
    }),
    z.object({
      type: z.literal("issue.deleted"),
      boardId: z.uuid(),
      issueId: z.uuid(),
    }),
    z.object({
      type: z.literal("section.created"),
      boardId: z.uuid(),
      section: sectionPayloadSchema,
    }),
    z.object({
      type: z.literal("section.updated"),
      boardId: z.uuid(),
      section: sectionPayloadSchema,
    }),
    z.object({
      type: z.literal("section.moved"),
      boardId: z.uuid(),
      position: z.number().int().min(0),
      sectionId: z.uuid(),
      updatedAt: z.iso.datetime(),
    }),
    z.object({
      type: z.literal("section.deleted"),
      boardId: z.uuid(),
      sectionId: z.uuid(),
    }),
    z.object({
      type: z.literal("comment.created"),
      boardId: z.uuid(),
      comment: commentPayloadSchema,
    }),
    z.object({
      type: z.literal("comment.updated"),
      boardId: z.uuid(),
      comment: commentPayloadSchema,
    }),
    z.object({
      type: z.literal("comment.deleted"),
      boardId: z.uuid(),
      commentId: z.uuid(),
      issueId: z.uuid(),
    }),
    z.object({
      type: z.literal("assignee.assigned"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      user: presenceUserSchema,
    }),
    z.object({
      type: z.literal("assignee.unassigned"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      userId: z.string().min(1).max(255),
    }),
    z.object({
      type: z.literal("member.added"),
      boardId: z.uuid(),
      role: z.enum(["admin", "member"]),
      user: presenceUserSchema,
    }),
    z.object({
      type: z.literal("member.removed"),
      boardId: z.uuid(),
      userId: z.string().min(1).max(255),
    }),
  ]);

type DatedBoard = Omit<BoardPayload, "updatedAt"> & { updatedAt: Date };
type DatedSection = Omit<SectionPayload, "updatedAt"> & { updatedAt: Date };
type DatedIssue = Omit<IssuePayload, "updatedAt"> & { updatedAt: Date };
type DatedComment = Omit<CommentPayload, "createdAt" | "updatedAt"> & {
  createdAt: Date;
  updatedAt: Date;
};

export function toBoardPayload(board: DatedBoard): BoardPayload {
  return {
    id: board.id,
    organisationId: board.organisationId,
    title: board.title,
    updatedAt: board.updatedAt.toISOString(),
  };
}

export function toSectionPayload(section: DatedSection): SectionPayload {
  return {
    boardId: section.boardId,
    id: section.id,
    position: section.position,
    title: section.title,
    updatedAt: section.updatedAt.toISOString(),
  };
}

export function toIssuePayload(issue: DatedIssue): IssuePayload {
  return {
    boardId: issue.boardId,
    description: issue.description,
    id: issue.id,
    position: issue.position,
    sectionId: issue.sectionId,
    title: issue.title,
    updatedAt: issue.updatedAt.toISOString(),
  };
}

export function toCommentPayload(comment: DatedComment): CommentPayload {
  return {
    author: comment.author,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    id: comment.id,
    issueId: comment.issueId,
    updatedAt: comment.updatedAt.toISOString(),
    userId: comment.userId,
  };
}

export function serializeBoardEvent(event: BoardEvent) {
  return JSON.stringify(event);
}
