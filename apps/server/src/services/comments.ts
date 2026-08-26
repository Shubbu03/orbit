import type { DatabaseConnection } from "@orbit/db";
import { boards, comments, issues, membership, user } from "@orbit/db/schema";
import { and, eq, exists, or } from "drizzle-orm";

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

export function createCommentService(database: DatabaseConnection) {
  function acceptedMembershipForComment(userId: string) {
    return database.database
      .select({ id: membership.id })
      .from(issues)
      .innerJoin(boards, eq(boards.id, issues.boardId))
      .innerJoin(
        membership,
        and(
          eq(membership.organisationId, boards.organisationId),
          eq(membership.userId, userId),
          eq(membership.accepted, true),
        ),
      )
      .where(eq(issues.id, comments.issueId));
  }

  function acceptedDeletionPermissionForComment(userId: string) {
    return database.database
      .select({ id: membership.id })
      .from(issues)
      .innerJoin(boards, eq(boards.id, issues.boardId))
      .innerJoin(
        membership,
        and(
          eq(membership.organisationId, boards.organisationId),
          eq(membership.userId, userId),
          eq(membership.accepted, true),
        ),
      )
      .where(
        and(
          eq(issues.id, comments.issueId),
          or(eq(comments.userId, userId), eq(membership.role, "admin")),
        ),
      );
  }

  async function getSafeAuthor(userId: string) {
    const [author] = await database.database
      .select({
        id: user.id,
        image: user.image,
        name: user.name,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!author) {
      throw new Error("Comment author was not found");
    }

    return author;
  }

  return {
    create: async (input: CreateCommentInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedIssueAccess] = await transaction
          .select({ membershipId: membership.id })
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
        };
      });
    },

    update: async (input: UpdateCommentInput) => {
      const [updatedComment] = await database.database
        .update(comments)
        .set({ content: input.content })
        .where(
          and(
            eq(comments.id, input.commentId),
            eq(comments.userId, input.userId),
            exists(acceptedMembershipForComment(input.userId)),
          ),
        )
        .returning();

      if (!updatedComment) {
        return null;
      }

      return {
        ...updatedComment,
        author: await getSafeAuthor(updatedComment.userId),
      };
    },

    deleteComment: async (input: DeleteCommentInput) => {
      const [deletedComment] = await database.database
        .delete(comments)
        .where(
          and(
            eq(comments.id, input.commentId),
            exists(acceptedDeletionPermissionForComment(input.userId)),
          ),
        )
        .returning({ id: comments.id });

      return deletedComment ?? null;
    },
  };
}

export type CommentService = ReturnType<typeof createCommentService>;
