import type { DatabaseConnection } from "@orbit/db";
import { boards, membership, sections } from "@orbit/db/schema";
import { and, asc, eq, exists, max } from "drizzle-orm";

import { createPage, type PaginationInput } from "../lib/pagination";
import { reorderItems } from "./ordering";

export type CreateSectionInput = {
  boardId: string;
  title: string;
  userId: string;
};

export type ListUserSectionsInput = PaginationInput & {
  boardId?: string;
  userId: string;
};

export type UpdateSectionInput = {
  sectionId: string;
  title: string;
  userId: string;
};

export type DeleteSectionInput = {
  sectionId: string;
  userId: string;
};

export type MoveSectionInput = {
  position: number;
  sectionId: string;
  userId: string;
};

export function createSectionService(database: DatabaseConnection) {
  function acceptedAdminMembershipForSection(userId: string) {
    return database.database
      .select({ id: membership.id })
      .from(boards)
      .innerJoin(
        membership,
        and(
          eq(membership.organisationId, boards.organisationId),
          eq(membership.userId, userId),
          eq(membership.accepted, true),
          eq(membership.role, "admin"),
        ),
      )
      .where(eq(boards.id, sections.boardId));
  }

  return {
    create: async (input: CreateSectionInput) => {
      return database.database.transaction(async (transaction) => {
        const [acceptedAdminAccess] = await transaction
          .select({ membershipId: membership.id })
          .from(boards)
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
              eq(membership.role, "admin"),
            ),
          )
          .where(eq(boards.id, input.boardId))
          .limit(1)
          .for("update");

        if (!acceptedAdminAccess) {
          return null;
        }

        const [currentPosition] = await transaction
          .select({ maximum: max(sections.position) })
          .from(sections)
          .where(eq(sections.boardId, input.boardId));

        const [createdSection] = await transaction
          .insert(sections)
          .values({
            boardId: input.boardId,
            id: crypto.randomUUID(),
            position: (currentPosition?.maximum ?? -1) + 1,
            title: input.title,
          })
          .returning();

        if (!createdSection) {
          throw new Error("Section insert did not return a row");
        }

        return createdSection;
      });
    },

    listForUser: async (input: ListUserSectionsInput) => {
      const accessConditions = [
        eq(membership.organisationId, boards.organisationId),
        eq(membership.userId, input.userId),
        eq(membership.accepted, true),
      ];

      const userSections = await database.database
        .select({
          boardId: sections.boardId,
          createdAt: sections.createdAt,
          id: sections.id,
          position: sections.position,
          title: sections.title,
          updatedAt: sections.updatedAt,
        })
        .from(sections)
        .innerJoin(boards, eq(boards.id, sections.boardId))
        .innerJoin(membership, and(...accessConditions))
        .where(input.boardId ? eq(sections.boardId, input.boardId) : undefined)
        .orderBy(
          asc(sections.boardId),
          asc(sections.position),
          asc(sections.id),
        )
        .limit(input.limit + 1)
        .offset(input.offset);

      return createPage(userSections, input);
    },

    update: async (input: UpdateSectionInput) => {
      const [updatedSection] = await database.database
        .update(sections)
        .set({ title: input.title })
        .where(
          and(
            eq(sections.id, input.sectionId),
            exists(acceptedAdminMembershipForSection(input.userId)),
          ),
        )
        .returning();

      return updatedSection ?? null;
    },

    move: async (input: MoveSectionInput) => {
      return database.database.transaction(async (transaction) => {
        const [authorizedSection] = await transaction
          .select({ boardId: sections.boardId, id: sections.id })
          .from(sections)
          .innerJoin(boards, eq(boards.id, sections.boardId))
          .innerJoin(
            membership,
            and(
              eq(membership.organisationId, boards.organisationId),
              eq(membership.userId, input.userId),
              eq(membership.accepted, true),
              eq(membership.role, "admin"),
            ),
          )
          .where(eq(sections.id, input.sectionId))
          .limit(1)
          .for("update");

        if (!authorizedSection) {
          return null;
        }

        const currentSections = await transaction
          .select({ id: sections.id, position: sections.position })
          .from(sections)
          .where(eq(sections.boardId, authorizedSection.boardId))
          .orderBy(asc(sections.position), asc(sections.id))
          .for("update");

        const reordered = reorderItems(
          currentSections,
          authorizedSection.id,
          input.position,
        );

        if (!reordered) {
          return null;
        }

        for (const [position, currentSection] of reordered.items.entries()) {
          if (currentSection.position !== position) {
            await transaction
              .update(sections)
              .set({ position })
              .where(eq(sections.id, currentSection.id));
          }
        }

        const [movedSection] = await transaction
          .select()
          .from(sections)
          .where(eq(sections.id, authorizedSection.id))
          .limit(1);

        if (!movedSection) {
          throw new Error("Moved section was not found");
        }

        return movedSection;
      });
    },

    deleteSection: async (input: DeleteSectionInput) => {
      const [deletedSection] = await database.database
        .delete(sections)
        .where(
          and(
            eq(sections.id, input.sectionId),
            exists(acceptedAdminMembershipForSection(input.userId)),
          ),
        )
        .returning({ boardId: sections.boardId, id: sections.id });

      return deletedSection ?? null;
    },
  };
}

export type SectionService = ReturnType<typeof createSectionService>;
