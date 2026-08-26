import type { DatabaseConnection } from "@orbit/db";
import { boards, membership, sections } from "@orbit/db/schema";
import { and, asc, eq, exists } from "drizzle-orm";

export type CreateSectionInput = {
  boardId: string;
  title: string;
  userId: string;
};

export type ListUserSectionsInput = {
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

        const [createdSection] = await transaction
          .insert(sections)
          .values({
            boardId: input.boardId,
            id: crypto.randomUUID(),
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

      return database.database
        .select({
          boardId: sections.boardId,
          createdAt: sections.createdAt,
          id: sections.id,
          title: sections.title,
          updatedAt: sections.updatedAt,
        })
        .from(sections)
        .innerJoin(boards, eq(boards.id, sections.boardId))
        .innerJoin(membership, and(...accessConditions))
        .where(input.boardId ? eq(sections.boardId, input.boardId) : undefined)
        .orderBy(
          asc(sections.boardId),
          asc(sections.createdAt),
          asc(sections.id),
        );
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

    deleteSection: async (input: DeleteSectionInput) => {
      const [deletedSection] = await database.database
        .delete(sections)
        .where(
          and(
            eq(sections.id, input.sectionId),
            exists(acceptedAdminMembershipForSection(input.userId)),
          ),
        )
        .returning({ id: sections.id });

      return deletedSection ?? null;
    },
  };
}

export type SectionService = ReturnType<typeof createSectionService>;
