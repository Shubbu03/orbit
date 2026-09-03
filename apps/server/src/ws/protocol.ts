import type {
  BoardEvent,
  BoardPayload,
  CommentPayload,
  IssuePayload,
  SectionPayload,
} from "@orbit/contracts/websocket";

export {
  boardEventSchema,
  clientWebSocketMessageSchema,
  publishedBoardEventSchema,
} from "@orbit/contracts/websocket";
export type {
  BoardEvent,
  BoardPayload,
  CommentPayload,
  IssuePayload,
  PresenceUser,
  PublishedBoardEvent,
  SectionPayload,
} from "@orbit/contracts/websocket";

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
