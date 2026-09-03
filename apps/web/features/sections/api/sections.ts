import {
  createSectionResponseSchema,
  sectionResponseSchema,
  type CreateSectionInput,
  type CreateSectionResponse,
  type MoveSectionInput,
  type SectionResponse,
  type UpdateSectionInput,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

export function createSection(input: CreateSectionInput) {
  return requestApi<CreateSectionResponse>(createSectionResponseSchema, {
    data: input,
    method: "POST",
    url: "/sections",
  });
}

export function updateSection(sectionId: string, input: UpdateSectionInput) {
  return requestApi<SectionResponse>(sectionResponseSchema, {
    data: input,
    method: "PUT",
    url: `/sections/${sectionId}`,
  });
}

export function moveSection(sectionId: string, input: MoveSectionInput) {
  return requestApi<SectionResponse>(sectionResponseSchema, {
    data: input,
    method: "PUT",
    url: `/sections/${sectionId}/move`,
  });
}

export function deleteSection(sectionId: string) {
  return requestApiVoid({ method: "DELETE", url: `/sections/${sectionId}` });
}
