import type { DatabaseConnection } from "@orbit/db";
import {
  boards,
  comments,
  issueMapping,
  issues,
  membership,
  sections,
  user,
} from "@orbit/db/schema";
import { and, asc, eq, exists, inArray, max } from "drizzle-orm";

import { createPage, type PaginationInput } from "../lib/pagination";
import { reorderItems } from "./ordering";

export type CreateIssueInput = {
  boardId: string;
  description: string;
  sectionId: string;
  title: string;
  userId: string;
};

export type ListUserIssuesInput = PaginationInput & {
  boardId?: string;
  userId: string;
};

export type GetIssueInput = PaginationInput & {
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
  position: number;
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

        const [currentPosition] = await transaction
          .select({ maximum: max(issues.position) })
          .from(issues)
          .where(eq(issues.sectionId, input.sectionId));

        const [createdIssue] = await transaction
          .insert(issues)
          .values({
            boardId: input.boardId,
            description: input.description,
            id: crypto.randomUUID(),
            position: (currentPosition?.maximum ?? -1) + 1,
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
      const userIssues = await database.database
        .select({
          boardId: issues.boardId,
          createdAt: issues.createdAt,
          description: issues.description,
          id: issues.id,
          position: issues.position,
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
        .where(input.boardId ? eq(issues.boardId, input.boardId) : undefined)
        .orderBy(
          asc(issues.boardId),
          asc(issues.sectionId),
          asc(issues.position),
          asc(issues.id),
        )
        .limit(input.limit + 1)
        .offset(input.offset);

      return createPage(userIssues, input);
    },

    getById: async (input: GetIssueInput) => {
      const [issue] = await database.database
        .select({
          boardId: issues.boardId,
          createdAt: issues.createdAt,
          description: issues.description,
          id: issues.id,
          position: issues.position,
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
        .orderBy(asc(comments.createdAt), asc(comments.id))
        .limit(input.limit + 1)
        .offset(input.offset);

      const issueAssignees = await database.database
        .select({
          id: user.id,
          image: user.image,
          name: user.name,
        })
        .from(issueMapping)
        .innerJoin(user, eq(user.id, issueMapping.userId))
        .where(eq(issueMapping.issueId, issue.id))
        .orderBy(asc(user.name), asc(user.id));
      const commentsPage = createPage(issueComments, input);

      return {
        ...issue,
        assignees: issueAssignees,
        comments: commentsPage.items,
        commentsPage: commentsPage.page,
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
      return database.database.transaction(async (transaction) => {
        const [issueAccess] = await transaction
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

        if (!issueAccess) {
          return null;
        }

        const [lockedBoard] = await transaction
          .select({ id: boards.id })
          .from(boards)
          .where(eq(boards.id, issueAccess.boardId))
          .limit(1)
          .for("update");

        if (!lockedBoard) {
          return null;
        }

        const [currentIssue] = await transaction
          .select()
          .from(issues)
          .where(
            and(
              eq(issues.id, input.issueId),
              eq(issues.boardId, lockedBoard.id),
            ),
          )
          .limit(1)
          .for("update");

        const [targetSection] = await transaction
          .select({ id: sections.id })
          .from(sections)
          .where(
            and(
              eq(sections.id, input.sectionId),
              eq(sections.boardId, lockedBoard.id),
            ),
          )
          .limit(1)
          .for("update");

        if (!currentIssue || !targetSection) {
          return null;
        }

        const affectedSectionIds =
          currentIssue.sectionId === targetSection.id
            ? [currentIssue.sectionId]
            : [currentIssue.sectionId, targetSection.id];
        const affectedIssues = await transaction
          .select()
          .from(issues)
          .where(
            and(
              eq(issues.boardId, lockedBoard.id),
              inArray(issues.sectionId, affectedSectionIds),
            ),
          )
          .orderBy(asc(issues.position), asc(issues.id))
          .for("update");

        if (currentIssue.sectionId === targetSection.id) {
          const reordered = reorderItems(
            affectedIssues,
            currentIssue.id,
            input.position,
          );

          if (!reordered) {
            return null;
          }

          for (const [position, currentItem] of reordered.items.entries()) {
            if (currentItem.position !== position) {
              await transaction
                .update(issues)
                .set({ position })
                .where(eq(issues.id, currentItem.id));
            }
          }
        } else {
          const sourceIssues = affectedIssues.filter(
            (currentItem) =>
              currentItem.sectionId === currentIssue.sectionId &&
              currentItem.id !== currentIssue.id,
          );
          const targetIssues = affectedIssues.filter(
            (currentItem) => currentItem.sectionId === targetSection.id,
          );
          const targetPosition = Math.min(input.position, targetIssues.length);
          const reorderedTargetIssues = [
            ...targetIssues.slice(0, targetPosition),
            currentIssue,
            ...targetIssues.slice(targetPosition),
          ];

          for (const [position, currentItem] of sourceIssues.entries()) {
            if (currentItem.position !== position) {
              await transaction
                .update(issues)
                .set({ position })
                .where(eq(issues.id, currentItem.id));
            }
          }

          for (const [
            position,
            currentItem,
          ] of reorderedTargetIssues.entries()) {
            if (
              currentItem.position !== position ||
              currentItem.sectionId !== targetSection.id
            ) {
              await transaction
                .update(issues)
                .set({ position, sectionId: targetSection.id })
                .where(eq(issues.id, currentItem.id));
            }
          }
        }

        const [movedIssue] = await transaction
          .select()
          .from(issues)
          .where(eq(issues.id, currentIssue.id))
          .limit(1);

        if (!movedIssue) {
          throw new Error("Moved issue was not found");
        }

        return movedIssue;
      });
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
        .returning({ boardId: issues.boardId, id: issues.id });

      return deletedIssue ?? null;
    },
  };
}

export type IssueService = ReturnType<typeof createIssueService>;
