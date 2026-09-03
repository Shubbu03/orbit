import {
  createOrganisationResponseSchema,
  organisationResponseSchema,
  organisationsResponseSchema,
  type CreateOrganisationInput,
  type CreateOrganisationResponse,
  type OrganisationResponse,
  type OrganisationsResponse,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

const ORGANISATIONS_PAGE_SIZE = 24;

export const organisationKeys = {
  all: ["organisations"] as const,
  detail: (organisationId: string) =>
    ["organisations", organisationId] as const,
};

export function getOrganisation(organisationId: string) {
  return requestApi<OrganisationResponse>(organisationResponseSchema, {
    method: "GET",
    url: `/organisation/${organisationId}`,
  });
}

export function listOrganisations(offset: number) {
  return requestApi<OrganisationsResponse>(organisationsResponseSchema, {
    method: "GET",
    params: {
      limit: ORGANISATIONS_PAGE_SIZE,
      offset,
    },
    url: "/organisation",
  });
}

export function createOrganisation(input: CreateOrganisationInput) {
  return requestApi<CreateOrganisationResponse>(
    createOrganisationResponseSchema,
    {
      data: input,
      method: "POST",
      url: "/organisation",
    },
  );
}

export function deleteOrganisation(organisationId: string) {
  return requestApiVoid({
    method: "DELETE",
    url: `/organisation/${organisationId}`,
  });
}
