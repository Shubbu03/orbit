import type { DatabaseConnection } from "@orbit/db";
import {
  boards,
  issueMapping,
  issues,
  membership,
  user,
} from "@orbit/db/schema";
import { and, asc, eq, exists } from "drizzle-orm";

export type RemoveMembershipInput = {
  organisationId: string;
  targetUserId: string;
  userId: string;
};

export type ListMembershipsInput = {
  organisationId: string;
  userId: string;
};

export type RemoveMembershipResult =
  | { membershipId: string; status: "removed" }
  | { status: "last_admin" | "not_found" };

export function createMembershipService(database: DatabaseConnection) {
  return {
    listForUser: async (input: ListMembershipsInput) => {
      return database.database.transaction(async (transaction) => {
        const [requestingMembership] = await transaction
          .select({ role: membership.role })
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
            ),
          )
          .limit(1)
          .for("share");

        if (!requestingMembership) {
          return null;
        }

        const visibilityCondition =
          requestingMembership.role === "admin"
            ? eq(membership.organisationId, input.organisationId)
            : and(
                eq(membership.organisationId, input.organisationId),
                eq(membership.accepted, true),
              );

        return transaction
          .select({
            accepted: membership.accepted,
            createdAt: membership.createdAt,
            id: membership.id,
            organisationId: membership.organisationId,
            role: membership.role,
            updatedAt: membership.updatedAt,
            user: {
              email: user.email,
              id: user.id,
              image: user.image,
              name: user.name,
            },
            userId: membership.userId,
          })
          .from(membership)
          .innerJoin(user, eq(user.id, membership.userId))
          .where(visibilityCondition)
          .orderBy(asc(membership.createdAt), asc(membership.id));
      });
    },

    remove: async (
      input: RemoveMembershipInput,
    ): Promise<RemoveMembershipResult> => {
      return database.database.transaction(async (transaction) => {
        const acceptedAdmins = await transaction
          .select({ id: membership.id, userId: membership.userId })
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.accepted, true),
              eq(membership.role, "admin"),
            ),
          )
          .orderBy(asc(membership.id))
          .for("update");

        const requestingAdmin = acceptedAdmins.some(
          (currentMembership) => currentMembership.userId === input.userId,
        );

        if (!requestingAdmin) {
          return { status: "not_found" };
        }

        const [targetMembership] = await transaction
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.userId, input.targetUserId),
            ),
          )
          .limit(1)
          .for("update");

        if (!targetMembership) {
          return { status: "not_found" };
        }

        if (
          targetMembership.accepted &&
          targetMembership.role === "admin" &&
          acceptedAdmins.length === 1
        ) {
          return { status: "last_admin" };
        }

        const issueBelongsToOrganisation = transaction
          .select({ id: issues.id })
          .from(issues)
          .innerJoin(boards, eq(boards.id, issues.boardId))
          .where(
            and(
              eq(issues.id, issueMapping.issueId),
              eq(boards.organisationId, input.organisationId),
            ),
          );

        await transaction
          .delete(issueMapping)
          .where(
            and(
              eq(issueMapping.userId, targetMembership.userId),
              exists(issueBelongsToOrganisation),
            ),
          );

        const [removedMembership] = await transaction
          .delete(membership)
          .where(eq(membership.id, targetMembership.id))
          .returning({ id: membership.id });

        if (!removedMembership) {
          throw new Error("Membership delete did not return a row");
        }

        return {
          membershipId: removedMembership.id,
          status: "removed",
        };
      });
    },
  };
}

export type MembershipService = ReturnType<typeof createMembershipService>;
