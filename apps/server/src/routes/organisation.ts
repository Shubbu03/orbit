import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import { paginationQueryFields } from "../lib/pagination";
import type { OrganisationService } from "../services/organisation";
import type { BoardEventPublisher } from "../ws/publisher";

const createOrganisationBodySchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500),
  })
  .strict();

const organisationParamsSchema = z
  .object({
    organisationId: z.uuid(),
  })
  .strict();

const listOrganisationsQuerySchema = z.object(paginationQueryFields).strict();

export type OrganisationRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateOrganisationRoutesOptions = {
  auth: OrganisationRouteAuth;
  eventPublisher: BoardEventPublisher;
  organisationService: Pick<
    OrganisationService,
    "create" | "deleteOrganisation" | "getById" | "listForUser"
  >;
};

type OrganisationRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export function createOrganisationRoutes({
  auth,
  eventPublisher,
  organisationService,
}: CreateOrganisationRoutesOptions) {
  const organisationRoutes = new Hono<OrganisationRoutesEnv>();

  organisationRoutes.use("*", async (context, next) => {
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

  organisationRoutes.post("/organisation", async (context) => {
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
    const parsedBody = createOrganisationBodySchema.safeParse(body);

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

    const createdOrganisation = await organisationService.create({
      ...parsedBody.data,
      ownerUserId: context.var.userId,
    });

    return context.json({ organization: createdOrganisation }, 201);
  });

  organisationRoutes.get("/organisation", async (context) => {
    const parsedQuery = listOrganisationsQuerySchema.safeParse(
      context.req.query(),
    );

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

    const result = await organisationService.listForUser({
      ...parsedQuery.data,
      userId: context.var.userId,
    });

    return context.json({ organizations: result.items, page: result.page });
  });

  organisationRoutes.get("/organisation/:organisationId", async (context) => {
    const parsedParams = organisationParamsSchema.safeParse(
      context.req.param(),
    );

    if (!parsedParams.success) {
      return context.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            fields: getFieldErrors(parsedParams.error),
            message: "Invalid organization ID",
          },
        },
        400,
      );
    }

    const currentOrganisation = await organisationService.getById({
      organisationId: parsedParams.data.organisationId,
      userId: context.var.userId,
    });

    if (!currentOrganisation) {
      return context.json(
        {
          error: {
            code: "ORGANIZATION_NOT_FOUND",
            message: "Organization not found",
          },
        },
        404,
      );
    }

    return context.json({ organization: currentOrganisation });
  });

  organisationRoutes.delete(
    "/organisation/:organisationId",
    async (context) => {
      const parsedParams = organisationParamsSchema.safeParse(
        context.req.param(),
      );

      if (!parsedParams.success) {
        return context.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              fields: getFieldErrors(parsedParams.error),
              message: "Invalid organization ID",
            },
          },
          400,
        );
      }

      const deletedOrganisation = await organisationService.deleteOrganisation({
        organisationId: parsedParams.data.organisationId,
        userId: context.var.userId,
      });

      if (!deletedOrganisation) {
        return context.json(
          {
            error: {
              code: "ORGANIZATION_NOT_FOUND",
              message: "Organization not found",
            },
          },
          404,
        );
      }

      for (const boardId of deletedOrganisation.boardIds) {
        eventPublisher.publish({ type: "board.deleted", boardId });
      }

      return context.body(null, 204);
    },
  );

  return organisationRoutes;
}
