import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import { paginationQueryFields } from "../lib/pagination";
import type { SectionService } from "../services/sections";
import { toSectionPayload } from "../ws/protocol";
import type { BoardEventPublisher } from "../ws/publisher";

const sectionParamsSchema = z
  .object({
    sectionId: z.uuid(),
  })
  .strict();

const createSectionBodySchema = z
  .object({
    boardId: z.uuid(),
    title: z.string().trim().min(1).max(100),
  })
  .strict();

const updateSectionBodySchema = createSectionBodySchema.pick({ title: true });

const moveSectionBodySchema = z
  .object({
    position: z.number().int().min(0),
  })
  .strict();

const listSectionsQuerySchema = z
  .object({
    boardId: z.uuid().optional(),
    ...paginationQueryFields,
  })
  .strict();

type SectionRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type SectionRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateSectionRoutesOptions = {
  auth: SectionRouteAuth;
  eventPublisher: BoardEventPublisher;
  sectionService: Pick<
    SectionService,
    "create" | "deleteSection" | "listForUser" | "move" | "update"
  >;
};

export function createSectionRoutes({
  auth,
  eventPublisher,
  sectionService,
}: CreateSectionRoutesOptions) {
  const sectionRoutes = new Hono<SectionRoutesEnv>();

  sectionRoutes.use("*", async (context, next) => {
    const session = await auth.getSession(context.req.raw.headers);

    if (!session) {
      return context.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required",
          },
        },
        401,
      );
    }

    context.set("userId", session.user.id);
    await next();
  });

  sectionRoutes.post("/sections", async (context) => {
    const contentType = context.req.header("content-type");

    if (!contentType?.toLowerCase().startsWith("application/json")) {
      return context.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }

    const body: unknown = await context.req.json().catch(() => null);
    const parsedBody = createSectionBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedBody.error),
            message: "Invalid request body",
          },
        },
        400,
      );
    }

    const createdSection = await sectionService.create({
      ...parsedBody.data,
      userId: context.var.userId,
    });

    if (!createdSection) {
      return context.json(
        {
          error: {
            code: "BOARD_NOT_FOUND",
            message: "Board not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "section.created",
      boardId: createdSection.boardId,
      section: toSectionPayload(createdSection),
    });

    return context.json({ section: createdSection }, 201);
  });

  sectionRoutes.get("/sections", async (context) => {
    const parsedQuery = listSectionsQuerySchema.safeParse(context.req.query());

    if (!parsedQuery.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedQuery.error),
            message: "Invalid query parameters",
          },
        },
        400,
      );
    }

    const userSections = await sectionService.listForUser({
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
      ...(parsedQuery.data.boardId
        ? { boardId: parsedQuery.data.boardId }
        : {}),
      userId: context.var.userId,
    });

    return context.json({
      sections: userSections.items,
      page: userSections.page,
    });
  });

  sectionRoutes.put("/sections/:sectionId", async (context) => {
    const parsedParams = sectionParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid section ID",
          },
        },
        400,
      );
    }

    const contentType = context.req.header("content-type");

    if (!contentType?.toLowerCase().startsWith("application/json")) {
      return context.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }

    const body: unknown = await context.req.json().catch(() => null);
    const parsedBody = updateSectionBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedBody.error),
            message: "Invalid request body",
          },
        },
        400,
      );
    }

    const updatedSection = await sectionService.update({
      sectionId: parsedParams.data.sectionId,
      title: parsedBody.data.title,
      userId: context.var.userId,
    });

    if (!updatedSection) {
      return context.json(
        {
          error: {
            code: "SECTION_NOT_FOUND",
            message: "Section not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "section.updated",
      boardId: updatedSection.boardId,
      section: toSectionPayload(updatedSection),
    });

    return context.json({ section: updatedSection });
  });

  sectionRoutes.put("/sections/:sectionId/move", async (context) => {
    const parsedParams = sectionParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid section ID",
          },
        },
        400,
      );
    }

    const contentType = context.req.header("content-type");

    if (!contentType?.toLowerCase().startsWith("application/json")) {
      return context.json(
        {
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: "Content-Type must be application/json",
          },
        },
        415,
      );
    }

    const body: unknown = await context.req.json().catch(() => null);
    const parsedBody = moveSectionBodySchema.safeParse(body);

    if (!parsedBody.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedBody.error),
            message: "Invalid request body",
          },
        },
        400,
      );
    }

    const movedSection = await sectionService.move({
      position: parsedBody.data.position,
      sectionId: parsedParams.data.sectionId,
      userId: context.var.userId,
    });

    if (!movedSection) {
      return context.json(
        {
          error: {
            code: "SECTION_NOT_FOUND",
            message: "Section not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "section.moved",
      boardId: movedSection.boardId,
      position: movedSection.position,
      sectionId: movedSection.id,
      updatedAt: movedSection.updatedAt.toISOString(),
    });

    return context.json({ section: movedSection });
  });

  sectionRoutes.delete("/sections/:sectionId", async (context) => {
    const parsedParams = sectionParamsSchema.safeParse(context.req.param());

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid section ID",
          },
        },
        400,
      );
    }

    const deletedSection = await sectionService.deleteSection({
      sectionId: parsedParams.data.sectionId,
      userId: context.var.userId,
    });

    if (!deletedSection) {
      return context.json(
        {
          error: {
            code: "SECTION_NOT_FOUND",
            message: "Section not found",
          },
        },
        404,
      );
    }

    eventPublisher.publish({
      type: "section.deleted",
      boardId: deletedSection.boardId,
      sectionId: deletedSection.id,
    });

    return context.body(null, 204);
  });

  return sectionRoutes;
}
