import {
  membershipsResponseSchema,
  type MembershipsResponse,
  type RemoveMembershipInput,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

const MEMBERS_PAGE_SIZE = 100;

export const membershipKeys = {
  all: ["memberships"] as const,
  list: (organisationId: string) =>
    ["memberships", "organisation", organisationId] as const,
};

export function listMemberships(organisationId: string, offset: number) {
  return requestApi<MembershipsResponse>(membershipsResponseSchema, {
    method: "GET",
    params: { limit: MEMBERS_PAGE_SIZE, offset, organisationId },
    url: "/memberships",
  });
}

export function removeMembership(input: RemoveMembershipInput) {
  return requestApiVoid({ data: input, method: "DELETE", url: "/membership" });
}
