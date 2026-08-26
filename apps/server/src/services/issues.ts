import type { DatabaseConnection } from "@orbit/db";
import {
  boards,
  comments,
  issues,
  membership,
  sections,
  user,
} from "@orbit/db/schema";
import { and, asc, desc, eq, exists } from "drizzle-orm";

export type CreateIssueInput = {
  boardId: string;
  description: string;
  sectionId: string;
  title: string;
  userId: string;
};

export type ListUserIssuesInput = {
  userId: string;
};

export type GetIssueInput = {
  issueId: string;
  userId: string;
};

export type UpdateIssueInput = {
  description: string;
  issueId: string;
  title: string;
  userId: string;
};

export type MoveIssueInput = {
  issueId: string;
  sectionId: string;
  userId: string;
};

export type DeleteIssueInput = {
  issueId: string;
  userId: string;
};

export function createIssueService(database: DatabaseConnection) {
  function acceptedMembershipForIssue(userId: string) {
    return database.database
      .select({ id: membership.id })
      .from(boards)
      .innerJoin(
        membership,
        and(
          eq(membership.organisationId, boards.organisationId),
          eq(membership.userId, userId),
          eq(membership.accepted, true),
        ),
      )
      .where(eq(boards.id, issues.boardId));
  }

  return {
    create: async (input: CreateIssueInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedBoardAccess] = await transaction
          .select({ membershipId: membership.id })
          .from(boards)
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
            ),
          )
          .innerJoin(
            sections,
            and(
              eq(sections.boardId, boards.id),
              eq(sections.id, input.sectionId),
            ),
          )
          .where(eq(boards.id, input.boardId))
          .limit(1)
          .for("update");

        if (!acceptedBoardAccess) {
          return null;
        }

        const [createdIssue] = await transaction
          .insert(issues)
          .values({
            boardId: input.boardId,
            description: input.description,
            id: crypto.randomUUID(),
            sectionId: input.sectionId,
            title: input.title,
          })
          .returning();

        if (!createdIssue) {
          throw new Error("Issue insert did not return a row");
        }

        return createdIssue;
      });
    },

    listForUser: async (input: ListUserIssuesInput) => {
      return database.database
        .select({
          boardId: issues.boardId,
          createdAt: issues.createdAt,
          description: issues.description,
          id: issues.id,
          sectionId: issues.sectionId,
          title: issues.title,
          updatedAt: issues.updatedAt,
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
        .orderBy(desc(issues.updatedAt), desc(issues.id));
    },

    getById: async (input: GetIssueInput) => {
      const [issue] = await database.database
        .select({
          boardId: issues.boardId,
          createdAt: issues.createdAt,
          description: issues.description,
          id: issues.id,
          sectionId: issues.sectionId,
          title: issues.title,
          updatedAt: issues.updatedAt,
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
        .limit(1);

      if (!issue) {
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
        .where(eq(comments.issueId, issue.id))
        .orderBy(asc(comments.createdAt), asc(comments.id));

      return {
        ...issue,
        comments: issueComments,
      };
    },

    update: async (input: UpdateIssueInput) => {
      const [updatedIssue] = await database.database
        .update(issues)
        .set({
          description: input.description,
          title: input.title,
        })
        .where(
          and(
            eq(issues.id, input.issueId),
            exists(acceptedMembershipForIssue(input.userId)),
          ),
        )
        .returning();

      return updatedIssue ?? null;
    },

    move: async (input: MoveIssueInput) => {
      const targetSectionOnCurrentBoard = database.database
        .select({ id: sections.id })
        .from(sections)
        .where(
          and(
            eq(sections.id, input.sectionId),
            eq(sections.boardId, issues.boardId),
          ),
        );

      const [movedIssue] = await database.database
        .update(issues)
        .set({ sectionId: input.sectionId })
        .where(
          and(
            eq(issues.id, input.issueId),
            exists(acceptedMembershipForIssue(input.userId)),
            exists(targetSectionOnCurrentBoard),
          ),
        )
        .returning();

      return movedIssue ?? null;
    },

    deleteIssue: async (input: DeleteIssueInput) => {
      const [deletedIssue] = await database.database
        .delete(issues)
        .where(
          and(
            eq(issues.id, input.issueId),
            exists(acceptedMembershipForIssue(input.userId)),
          ),
        )
        .returning({ id: issues.id });

      return deletedIssue ?? null;
    },
  };
}

export type IssueService = ReturnType<typeof createIssueService>;
