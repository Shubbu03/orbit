import { z } from "zod";

import { personSchema } from "./entities";

export const clientWebSocketMessageSchema = z
  .object({ type: z.literal("system.pong") })
  .strict();

const boardPayloadSchema = z
  .object({
    id: z.uuid(),
    organisationId: z.uuid(),
    title: z.string().min(1).max(100),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const sectionPayloadSchema = z
  .object({
    boardId: z.uuid(),
    id: z.uuid(),
    position: z.number().int().min(0),
    title: z.string().min(1).max(100),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const issuePayloadSchema = z
  .object({
    boardId: z.uuid(),
    description: z.string().max(5_000),
    id: z.uuid(),
    position: z.number().int().min(0),
    sectionId: z.uuid(),
    title: z.string().min(1).max(200),
    updatedAt: z.iso.datetime(),
  })
  .strict();

const commentPayloadSchema = z
  .object({
    author: personSchema,
    content: z.string().min(1).max(5_000),
    createdAt: z.iso.datetime(),
    id: z.uuid(),
    issueId: z.uuid(),
    updatedAt: z.iso.datetime(),
    userId: z.string().min(1).max(255),
  })
  .strict();

const presenceSnapshotEventSchema = z
  .object({
    type: z.literal("presence.snapshot"),
    boardId: z.uuid(),
    users: z.array(personSchema),
  })
  .strict();

const presenceJoinedEventSchema = z
  .object({
    type: z.literal("presence.joined"),
    boardId: z.uuid(),
    user: personSchema,
  })
  .strict();

const presenceLeftEventSchema = z
  .object({
    type: z.literal("presence.left"),
    boardId: z.uuid(),
    userId: z.string().min(1).max(255),
  })
  .strict();

const systemPingEventSchema = z
  .object({
    type: z.literal("system.ping"),
    boardId: z.uuid(),
    sentAt: z.iso.datetime(),
  })
  .strict();

const publishedEventSchemas = [
  z
    .object({
      type: z.literal("board.updated"),
      boardId: z.uuid(),
      board: boardPayloadSchema,
    })
    .strict(),
  z.object({ type: z.literal("board.deleted"), boardId: z.uuid() }).strict(),
  z
    .object({
      type: z.literal("issue.created"),
      boardId: z.uuid(),
      issue: issuePayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("issue.updated"),
      boardId: z.uuid(),
      issue: issuePayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("issue.moved"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      position: z.number().int().min(0),
      sectionId: z.uuid(),
      updatedAt: z.iso.datetime(),
    })
    .strict(),
  z
    .object({
      type: z.literal("issue.deleted"),
      boardId: z.uuid(),
      issueId: z.uuid(),
    })
    .strict(),
  z
    .object({
      type: z.literal("section.created"),
      boardId: z.uuid(),
      section: sectionPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("section.updated"),
      boardId: z.uuid(),
      section: sectionPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("section.moved"),
      boardId: z.uuid(),
      position: z.number().int().min(0),
      sectionId: z.uuid(),
      updatedAt: z.iso.datetime(),
    })
    .strict(),
  z
    .object({
      type: z.literal("section.deleted"),
      boardId: z.uuid(),
      sectionId: z.uuid(),
    })
    .strict(),
  z
    .object({
      type: z.literal("comment.created"),
      boardId: z.uuid(),
      comment: commentPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("comment.updated"),
      boardId: z.uuid(),
      comment: commentPayloadSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("comment.deleted"),
      boardId: z.uuid(),
      commentId: z.uuid(),
      issueId: z.uuid(),
    })
    .strict(),
  z
    .object({
      type: z.literal("assignee.assigned"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      user: personSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("assignee.unassigned"),
      boardId: z.uuid(),
      issueId: z.uuid(),
      userId: z.string().min(1).max(255),
    })
    .strict(),
  z
    .object({
      type: z.literal("member.added"),
      boardId: z.uuid(),
      role: z.enum(["admin", "member"]),
      user: personSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("member.removed"),
      boardId: z.uuid(),
      userId: z.string().min(1).max(255),
    })
    .strict(),
] as const;

export const publishedBoardEventSchema = z.discriminatedUnion(
  "type",
  publishedEventSchemas,
);

export const boardEventSchema = z.discriminatedUnion("type", [
  presenceSnapshotEventSchema,
  presenceJoinedEventSchema,
  presenceLeftEventSchema,
  systemPingEventSchema,
  ...publishedEventSchemas,
]);

export type ClientWebSocketMessage = z.infer<
  typeof clientWebSocketMessageSchema
>;
export type PresenceUser = z.infer<typeof personSchema>;
export type BoardPayload = z.infer<typeof boardPayloadSchema>;
export type SectionPayload = z.infer<typeof sectionPayloadSchema>;
export type IssuePayload = z.infer<typeof issuePayloadSchema>;
export type CommentPayload = z.infer<typeof commentPayloadSchema>;
export type BoardEvent = z.infer<typeof boardEventSchema>;
export type PublishedBoardEvent = z.infer<typeof publishedBoardEventSchema>;
