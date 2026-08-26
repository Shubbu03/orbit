import { Hono } from "hono";
import { z } from "zod";

import { getFieldErrors } from "../lib/error";
import type { InviteService } from "../services/invite";

const inviteBodySchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email()),
    organisationId: z.uuid(),
  })
  .strict();

const acceptInvitationBodySchema = inviteBodySchema.pick({
  organisationId: true,
});

type InviteRoutesEnv = {
  Variables: {
    userId: string;
  };
};

export type InviteRouteAuth = {
  getSession: (headers: Headers) => Promise<{ user: { id: string } } | null>;
};

type CreateInviteRoutesOptions = {
  auth: InviteRouteAuth;
  inviteService: Pick<InviteService, "accept" | "invite">;
};

export function createInviteRoutes({
  auth,
  inviteService,
}: CreateInviteRoutesOptions) {
  const inviteRoutes = new Hono<InviteRoutesEnv>();

  inviteRoutes.use("*", async (context, next) => {
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

  inviteRoutes.post("/invite", async (context) => {
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
    const parsedBody = inviteBodySchema.safeParse(body);

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

    const result = await inviteService.invite({
      ...parsedBody.data,
      userId: context.var.userId,
    });

    switch (result.status) {
      case "created":
        return context.json({ invitation: result.invitation }, 201);
      case "already_invited":
        return context.json(
          {
            error: {
              code: "ALREADY_INVITED",
              message: "User already has a pending invitation",
            },
          },
          409,
        );
      case "already_member":
        return context.json(
          {
            error: {
              code: "ALREADY_MEMBER",
              message: "User is already an organization member",
            },
          },
          409,
        );
      case "user_not_found":
        return context.json(
          {
            error: {
              code: "USER_NOT_FOUND",
              message: "No Orbit user was found for that email",
            },
          },
          404,
        );
      case "organisation_not_found":
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
  });

  inviteRoutes.post("/accept", async (context) => {
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
    const parsedBody = acceptInvitationBodySchema.safeParse(body);

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

    const result = await inviteService.accept({
      organisationId: parsedBody.data.organisationId,
      userId: context.var.userId,
    });

    if (result.status === "not_found") {
      return context.json(
        {
          error: {
            code: "INVITATION_NOT_FOUND",
            message: "Invitation not found",
          },
        },
        404,
      );
    }

    return context.json({ membership: result.membership });
  });

  return inviteRoutes;
}
