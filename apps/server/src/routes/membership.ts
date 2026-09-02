import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import { paginationQueryFields } from "../lib/pagination";
import type { MembershipService } from "../services/membership";
import type { BoardEventPublisher } from "../ws/publisher";

const removeMembershipBodySchema = z
  .object({
    organisationId: z.uuid(),
    userId: z.string().trim().min(1).max(255),
  })
  .strict();

const listMembershipsQuerySchema = removeMembershipBodySchema
  .pick({ organisationId: true })
  .extend(paginationQueryFields);

type MembershipRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type MembershipRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateMembershipRoutesOptions = {
  auth: MembershipRouteAuth;
  eventPublisher: BoardEventPublisher;
  membershipService: Pick<MembershipService, "listForUser" | "remove">;
};

export function createMembershipRoutes({
  auth,
  eventPublisher,
  membershipService,
}: CreateMembershipRoutesOptions) {
  const membershipRoutes = new Hono<MembershipRoutesEnv>();

  membershipRoutes.use("*", async (context, next) => {
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

  membershipRoutes.get("/memberships", async (context) => {
    const parsedQuery = listMembershipsQuerySchema.safeParse(
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

    const memberships = await membershipService.listForUser({
      limit: parsedQuery.data.limit,
      offset: parsedQuery.data.offset,
      organisationId: parsedQuery.data.organisationId,
      userId: context.var.userId,
    });

    if (!memberships) {
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

    return context.json({
      memberships: memberships.items,
      page: memberships.page,
    });
  });

  membershipRoutes.delete("/membership", async (context) => {
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
    const parsedBody = removeMembershipBodySchema.safeParse(body);

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

    const result = await membershipService.remove({
      organisationId: parsedBody.data.organisationId,
      targetUserId: parsedBody.data.userId,
      userId: context.var.userId,
    });

    if (result.status === "last_admin") {
      return context.json(
        {
          error: {
            code: "LAST_ADMIN",
            message: "The last organization admin cannot be removed",
          },
        },
        409,
      );
    }

    if (result.status === "not_found") {
      return context.json(
        {
          error: {
            code: "MEMBERSHIP_NOT_FOUND",
            message: "Membership not found",
          },
        },
        404,
      );
    }

    for (const boardId of result.boardIds) {
      eventPublisher.publish({
        type: "member.removed",
        boardId,
        userId: result.targetUserId,
      });
    }

    return context.body(null, 204);
  });

  return membershipRoutes;
}
