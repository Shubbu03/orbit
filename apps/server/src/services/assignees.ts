import type { DatabaseConnection } from "@orbit/db";
import {
  boards,
  issueMapping,
  issues,
  membership,
  user,
} from "@orbit/db/schema";
import { and, eq } from "drizzle-orm";

export type AssignIssueInput = {
  issueId: string;
  targetUserId: string;
  userId: string;
};

export type UnassignIssueInput = AssignIssueInput;

export type AssignIssueResult =
  | {
      assignment: {
        issueId: string;
        user: { id: string; image: string | null; name: string };
      };
      boardId: string;
      status: "assigned" | "already_assigned";
    }
  | { status: "not_found" };

export function createAssigneeService(database: DatabaseConnection) {
  return {
    assign: async (input: AssignIssueInput): Promise<AssignIssueResult> => {
      return database.database.transaction(async (transaction) => {
        const [issueAccess] = await transaction
          .select({
            boardId: issues.boardId,
            organisationId: boards.organisationId,
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

        if (!issueAccess) {
          return { status: "not_found" };
        }

        const [targetMember] = await transaction
          .select({
            id: user.id,
            image: user.image,
            name: user.name,
          })
          .from(membership)
          .innerJoin(user, eq(user.id, membership.userId))
          .where(
            and(
              eq(membership.organisationId, issueAccess.organisationId),
              eq(membership.userId, input.targetUserId),
              eq(membership.accepted, true),
            ),
          )
          .limit(1)
          .for("share");

        if (!targetMember) {
          return { status: "not_found" };
        }

        const [createdAssignment] = await transaction
          .insert(issueMapping)
          .values({
            id: crypto.randomUUID(),
            issueId: input.issueId,
            userId: input.targetUserId,
          })
          .onConflictDoNothing({
            target: [issueMapping.userId, issueMapping.issueId],
          })
          .returning({ id: issueMapping.id });

        return {
          assignment: {
            issueId: input.issueId,
            user: targetMember,
          },
          boardId: issueAccess.boardId,
          status: createdAssignment ? "assigned" : "already_assigned",
        };
      });
    },

    unassign: async (input: UnassignIssueInput) => {
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
          .limit(1)
          .for("update");

        if (!issueAccess) {
          return null;
        }

        const [deletedAssignment] = await transaction
          .delete(issueMapping)
          .where(
            and(
              eq(issueMapping.issueId, input.issueId),
              eq(issueMapping.userId, input.targetUserId),
            ),
          )
          .returning({ id: issueMapping.id });

        if (!deletedAssignment) {
          return null;
        }

        return {
          boardId: issueAccess.boardId,
          issueId: input.issueId,
          userId: input.targetUserId,
        };
      });
    },
  };
}

export type AssigneeService = ReturnType<typeof createAssigneeService>;
