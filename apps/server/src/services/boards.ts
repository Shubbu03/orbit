import type { DatabaseConnection } from "@orbit/db";
import {
  boards,
  issueMapping,
  issues,
  membership,
  sections,
  user,
} from "@orbit/db/schema";
import { and, asc, desc, eq, exists } from "drizzle-orm";

import { createPage, type PaginationInput } from "../lib/pagination";

export type CreateBoardInput = {
  organisationId: string;
  title: string;
  userId: string;
};

export type ListUserBoardsInput = PaginationInput & {
  organisationId?: string;
  userId: string;
};

export type GetBoardInput = {
  boardId: string;
  userId: string;
};

export type UpdateBoardInput = {
  boardId: string;
  title: string;
  userId: string;
};

export type DeleteBoardInput = {
  boardId: string;
  userId: string;
};

export function createBoardService(database: DatabaseConnection) {
  return {
    create: async (input: CreateBoardInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedAdminMembership] = await transaction
          .select({ id: membership.id })
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
              eq(membership.role, "admin"),
            ),
          )
          .limit(1)
          .for("update");

        if (!acceptedAdminMembership) {
          return null;
        }

        const [createdBoard] = await transaction
          .insert(boards)
          .values({
            id: crypto.randomUUID(),
            organisationId: input.organisationId,
            title: input.title,
          })
          .returning();

        if (!createdBoard) {
          throw new Error("Board insert did not return a row");
        }

        return createdBoard;
      });
    },

    listForUser: async (input: ListUserBoardsInput) => {
      const userBoards = await database.database
        .select({
          createdAt: boards.createdAt,
          id: boards.id,
          organisationId: boards.organisationId,
          role: membership.role,
          title: boards.title,
          updatedAt: boards.updatedAt,
        })
        .from(boards)
        .innerJoin(
          membership,
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
          ),
        )
        .where(
          input.organisationId
            ? eq(boards.organisationId, input.organisationId)
            : undefined,
        )
        .orderBy(desc(boards.createdAt), desc(boards.id))
        .limit(input.limit + 1)
        .offset(input.offset);

      return createPage(userBoards, input);
    },

    getById: async (input: GetBoardInput) => {
      const [board] = await database.database
        .select({
          createdAt: boards.createdAt,
          id: boards.id,
          organisationId: boards.organisationId,
          role: membership.role,
          title: boards.title,
          updatedAt: boards.updatedAt,
        })
        .from(boards)
        .innerJoin(
          membership,
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
          ),
        )
        .where(eq(boards.id, input.boardId))
        .limit(1);

      if (!board) {
        return null;
      }

      const boardSections = await database.database
        .select()
        .from(sections)
        .where(eq(sections.boardId, board.id))
        .orderBy(asc(sections.position), asc(sections.id));
      const boardIssues = await database.database
        .select()
        .from(issues)
        .where(eq(issues.boardId, board.id))
        .orderBy(asc(issues.sectionId), asc(issues.position), asc(issues.id));
      const boardAssignees = await database.database
        .select({
          issueId: issueMapping.issueId,
          user: {
            id: user.id,
            image: user.image,
            name: user.name,
          },
        })
        .from(issueMapping)
        .innerJoin(issues, eq(issues.id, issueMapping.issueId))
        .innerJoin(user, eq(user.id, issueMapping.userId))
        .where(eq(issues.boardId, board.id))
        .orderBy(asc(issueMapping.issueId), asc(user.name), asc(user.id));

      const assigneesByIssue = new Map<
        string,
        (typeof boardAssignees)[number]["user"][]
      >();

      for (const assignment of boardAssignees) {
        const currentAssignees = assigneesByIssue.get(assignment.issueId) ?? [];
        currentAssignees.push(assignment.user);
        assigneesByIssue.set(assignment.issueId, currentAssignees);
      }

      const issuesBySection = new Map<string, (typeof boardIssues)[number][]>();

      for (const issue of boardIssues) {
        const currentIssues = issuesBySection.get(issue.sectionId) ?? [];
        currentIssues.push(issue);
        issuesBySection.set(issue.sectionId, currentIssues);
      }

      return {
        ...board,
        sections: boardSections.map((section) => ({
          ...section,
          issues: (issuesBySection.get(section.id) ?? []).map((issue) => ({
            ...issue,
            assignees: assigneesByIssue.get(issue.id) ?? [],
          })),
        })),
      };
    },

    update: async (input: UpdateBoardInput) => {
      const acceptedAdminMembership = database.database
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
            eq(membership.role, "admin"),
          ),
        );

      const [updatedBoard] = await database.database
        .update(boards)
        .set({ title: input.title })
        .where(
          and(eq(boards.id, input.boardId), exists(acceptedAdminMembership)),
        )
        .returning();

      return updatedBoard ?? null;
    },

    deleteBoard: async (input: DeleteBoardInput) => {
      const acceptedAdminMembership = database.database
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, boards.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
            eq(membership.role, "admin"),
          ),
        );

      const [deletedBoard] = await database.database
        .delete(boards)
        .where(
          and(eq(boards.id, input.boardId), exists(acceptedAdminMembership)),
        )
        .returning({ id: boards.id });

      return deletedBoard ?? null;
    },
  };
}

export type BoardService = ReturnType<typeof createBoardService>;
