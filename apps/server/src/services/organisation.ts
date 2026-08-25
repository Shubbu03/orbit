import type { DatabaseConnection } from "@orbit/db";
import { membership, organisation } from "@orbit/db/schema";
import { and, eq, exists } from "drizzle-orm";

export type CreateOrganisationInput = {
  description: string;
  name: string;
  ownerUserId: string;
};

export type ListUserOrganisationsInput = {
  userId: string;
};

export type DeleteOrganisationInput = {
  organisationId: string;
  userId: string;
};

export function createOrganisationService(database: DatabaseConnection) {
  return {
    create: async (input: CreateOrganisationInput) => {
      return database.database.transaction(async (transaction) => {
        const organisationId = crypto.randomUUID();

        const [createdOrganisation] = await transaction
          .insert(organisation)
          .values({
            description: input.description,
            id: organisationId,
            name: input.name,
          })
          .returning();

        if (!createdOrganisation) {
          throw new Error("Organisation insert did not return a row");
        }

        await transaction.insert(membership).values({
          accepted: true,
          id: crypto.randomUUID(),
          organisationId,
          role: "admin",
          userId: input.ownerUserId,
        });

        return createdOrganisation;
      });
    },

    listForUser: async (input: ListUserOrganisationsInput) => {
      const acceptedMemberships =
        await database.database.query.membership.findMany({
          columns: {
            role: true,
          },
          orderBy: (currentMembership, { desc }) => [
            desc(currentMembership.createdAt),
            desc(currentMembership.id),
          ],
          where: (currentMembership, { and, eq }) =>
            and(
              eq(currentMembership.userId, input.userId),
              eq(currentMembership.accepted, true),
            ),
          with: {
            organisation: {
              columns: {
                createdAt: true,
                description: true,
                id: true,
                name: true,
                updatedAt: true,
              },
            },
          },
        });

      return acceptedMemberships.map(
        ({ organisation: currentOrganisation, role }) => ({
          ...currentOrganisation,
          role,
        }),
      );
    },

    deleteOrganisation: async (input: DeleteOrganisationInput) => {
      const acceptedAdminMembership = database.database
        .select({ id: membership.id })
        .from(membership)
        .where(
          and(
            eq(membership.organisationId, organisation.id),
            eq(membership.userId, input.userId),
            eq(membership.accepted, true),
            eq(membership.role, "admin"),
          ),
        );

      const [deletedOrganisation] = await database.database
        .delete(organisation)
        .where(
          and(
            eq(organisation.id, input.organisationId),
            exists(acceptedAdminMembership),
          ),
        )
        .returning({ id: organisation.id });

      return deletedOrganisation ?? null;
    },
  };
}

export type OrganisationService = ReturnType<typeof createOrganisationService>;
