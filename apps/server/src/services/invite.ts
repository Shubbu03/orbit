import type { DatabaseConnection } from "@orbit/db";
import { membership, user } from "@orbit/db/schema";
import { and, eq } from "drizzle-orm";

type MembershipRecord = typeof membership.$inferSelect;

export type InviteMemberInput = {
  email: string;
  organisationId: string;
  userId: string;
};

export type InviteMemberResult =
  | { invitation: MembershipRecord; status: "created" }
  | { status: "already_invited" | "already_member" }
  | { status: "organisation_not_found" | "user_not_found" };

export type AcceptInvitationInput = {
  organisationId: string;
  userId: string;
};

export type AcceptInvitationResult =
  | {
      membership: MembershipRecord;
      status: "accepted" | "already_accepted";
    }
  | { status: "not_found" };

export function createInviteService(database: DatabaseConnection) {
  return {
    invite: async (input: InviteMemberInput): Promise<InviteMemberResult> => {
      return database.database.transaction(async (transaction) => {
        const [invitingAdmin] = await transaction
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

        if (!invitingAdmin) {
          return { status: "organisation_not_found" };
        }

        const normalizedEmail = input.email.trim().toLowerCase();
        const [invitedUser] = await transaction
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, normalizedEmail))
          .limit(1);

        if (!invitedUser) {
          return { status: "user_not_found" };
        }

        const [createdInvitation] = await transaction
          .insert(membership)
          .values({
            accepted: false,
            id: crypto.randomUUID(),
            organisationId: input.organisationId,
            role: "member",
            userId: invitedUser.id,
          })
          .onConflictDoNothing({
            target: [membership.userId, membership.organisationId],
          })
          .returning();

        if (createdInvitation) {
          return { invitation: createdInvitation, status: "created" };
        }

        const [existingMembership] = await transaction
          .select({ accepted: membership.accepted })
          .from(membership)
          .where(
            and(
              eq(membership.organisationId, input.organisationId),
              eq(membership.userId, invitedUser.id),
            ),
          )
          .limit(1);

        if (!existingMembership) {
          throw new Error("Membership conflict did not return an existing row");
        }

        return {
          status: existingMembership.accepted
            ? "already_member"
            : "already_invited",
        };
      });
    },

    accept: async (
      input: AcceptInvitationInput,
    ): Promise<AcceptInvitationResult> => {
      const [acceptedMembership] = await database.database
        .update(membership)
        .set({ accepted: true })
        .where(
          and(
            eq(membership.organisationId, input.organisationId),
            eq(membership.userId, input.userId),
            eq(membership.accepted, false),
          ),
        )
        .returning();

      if (acceptedMembership) {
        return { membership: acceptedMembership, status: "accepted" };
      }

      const [existingMembership] = await database.database
        .select()
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, input.organisationId),
            eq(membership.userId, input.userId),
          ),
        )
        .limit(1);

      if (existingMembership?.accepted) {
        return {
          membership: existingMembership,
          status: "already_accepted",
        };
      }

      return { status: "not_found" };
    },
  };
}

export type InviteService = ReturnType<typeof createInviteService>;
