import type { DatabaseConnection } from "@orbit/db";
import { boards, comments, issues, membership, user } from "@orbit/db/schema";
import { and, desc, eq, or } from "drizzle-orm";

import { createPage, type PaginationInput } from "../lib/pagination";

export type CreateCommentInput = {
  content: string;
  issueId: string;
  userId: string;
};

export type UpdateCommentInput = {
  commentId: string;
  content: string;
  userId: string;
};

export type DeleteCommentInput = {
  commentId: string;
  userId: string;
};

export type ListIssueCommentsInput = PaginationInput & {
  issueId: string;
  userId: string;
};

export function createCommentService(database: DatabaseConnection) {
  return {
    listForIssue: async (input: ListIssueCommentsInput) => {
      const [accessibleIssue] = await database.database
        .select({ boardId: issues.boardId })
        .from(issues)
        .innerJoin(boards, eq(boards.id, issues.boardId))
        .innerJoin(
          membership,
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
          ),
        )
        .where(eq(issues.id, input.issueId))
        .limit(1);

      if (!accessibleIssue) {
        return null;
      }

      const issueComments = await database.database
        .select({
          author: {
            id: user.id,
            image: user.image,
            name: user.name,
          },
          content: comments.content,
          createdAt: comments.createdAt,
          id: comments.id,
          issueId: comments.issueId,
          updatedAt: comments.updatedAt,
          userId: comments.userId,
        })
        .from(comments)
        .innerJoin(user, eq(user.id, comments.userId))
        .where(eq(comments.issueId, input.issueId))
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(input.limit + 1)
        .offset(input.offset);

      return createPage(issueComments, input);
    },

    create: async (input: CreateCommentInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedIssueAccess] = await transaction
          .select({
            boardId: issues.boardId,
            membershipId: membership.id,
          })
          .from(issues)
          .innerJoin(boards, eq(boards.id, issues.boardId))
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
            ),
          )
          .where(eq(issues.id, input.issueId))
          .limit(1)
          .for("update");

        if (!acceptedIssueAccess) {
          return null;
        }

        const [createdComment] = await transaction
          .insert(comments)
          .values({
            content: input.content,
            id: crypto.randomUUID(),
            issueId: input.issueId,
            userId: input.userId,
          })
          .returning();

        if (!createdComment) {
          throw new Error("Comment insert did not return a row");
        }

        const [author] = await transaction
          .select({
            id: user.id,
            image: user.image,
            name: user.name,
          })
          .from(user)
          .where(eq(user.id, input.userId))
          .limit(1);

        if (!author) {
          throw new Error("Comment author was not found");
        }

        return {
          ...createdComment,
          author,
          boardId: acceptedIssueAccess.boardId,
        };
      });
    },

    update: async (input: UpdateCommentInput) => {
      return database.database.transaction(async (transaction) => {
        const [commentAccess] = await transaction
          .select({
            author: {
              id: user.id,
              image: user.image,
              name: user.name,
            },
            boardId: issues.boardId,
          })
          .from(comments)
          .innerJoin(issues, eq(issues.id, comments.issueId))
          .innerJoin(boards, eq(boards.id, issues.boardId))
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
            ),
          )
          .innerJoin(user, eq(user.id, comments.userId))
          .where(
            and(
              eq(comments.id, input.commentId),
              eq(comments.userId, input.userId),
            ),
          )
          .limit(1)
          .for("update");

        if (!commentAccess) {
          return null;
        }

        const [updatedComment] = await transaction
          .update(comments)
          .set({ content: input.content })
          .where(eq(comments.id, input.commentId))
          .returning();

        if (!updatedComment) {
          throw new Error("Comment update did not return a row");
        }

        return {
          ...updatedComment,
          author: commentAccess.author,
          boardId: commentAccess.boardId,
        };
      });
    },

    deleteComment: async (input: DeleteCommentInput) => {
      return database.database.transaction(async (transaction) => {
        const [commentAccess] = await transaction
          .select({
            boardId: issues.boardId,
            issueId: comments.issueId,
          })
          .from(comments)
          .innerJoin(issues, eq(issues.id, comments.issueId))
          .innerJoin(boards, eq(boards.id, issues.boardId))
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
            ),
          )
          .where(
            and(
              eq(comments.id, input.commentId),
              or(
                eq(comments.userId, input.userId),
                eq(membership.role, "admin"),
              ),
            ),
          )
          .limit(1)
          .for("update");

        if (!commentAccess) {
          return null;
        }

        const [deletedComment] = await transaction
          .delete(comments)
          .where(eq(comments.id, input.commentId))
          .returning({ id: comments.id });

        if (!deletedComment) {
          throw new Error("Comment delete did not return a row");
        }

        return {
          ...deletedComment,
          boardId: commentAccess.boardId,
          issueId: commentAccess.issueId,
        };
      });
    },
  };
}

export type CommentService = ReturnType<typeof createCommentService>;
