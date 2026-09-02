import type { DatabaseConnection } from "@orbit/db";
import { boards, membership, organisation } from "@orbit/db/schema";
import { and, eq } from "drizzle-orm";

import { createPage, type PaginationInput } from "../lib/pagination";

export type CreateOrganisationInput = {
  description: string;
  name: string;
  ownerUserId: string;
};

export type ListUserOrganisationsInput = PaginationInput & {
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
          limit: input.limit + 1,
          offset: input.offset,
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

      return createPage(
        acceptedMemberships.map(
          ({ organisation: currentOrganisation, role }) => ({
            ...currentOrganisation,
            role,
          }),
        ),
        input,
      );
    },

    deleteOrganisation: async (input: DeleteOrganisationInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedAdminMembership] = await transaction
          .select({ id: membership.id })
          .from(organisation)
          .innerJoin(membership, eq(membership.organisationId, organisation.id))
          .where(
            and(
              eq(organisation.id, input.organisationId),
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

        const organisationBoards = await transaction
          .select({ id: boards.id })
          .from(boards)
          .where(eq(boards.organisationId, input.organisationId));
        const [deletedOrganisation] = await transaction
          .delete(organisation)
          .where(eq(organisation.id, input.organisationId))
          .returning({ id: organisation.id });

        return deletedOrganisation
          ? {
              ...deletedOrganisation,
              boardIds: organisationBoards.map((board) => board.id),
            }
          : null;
      });
    },
  };
}

export type OrganisationService = ReturnType<typeof createOrganisationService>;
