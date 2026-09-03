import {
  createIssueResponseSchema,
  issueRecordResponseSchema,
  issueResponseSchema,
  type CreateIssueInput,
  type CreateIssueResponse,
  type IssueRecordResponse,
  type IssueResponse,
  type MoveIssueInput,
  type UpdateIssueInput,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

export const issueKeys = {
  all: ["issues"] as const,
  detail: (issueId: string) => ["issues", issueId] as const,
};

export function createIssue(input: CreateIssueInput) {
  return requestApi<CreateIssueResponse>(createIssueResponseSchema, {
    data: input,
    method: "POST",
    url: "/issues",
  });
}

export function getIssue(issueId: string) {
  return requestApi<IssueResponse>(issueResponseSchema, {
    method: "GET",
    params: { limit: 50, offset: 0 },
    url: `/issues/${issueId}`,
  });
}

export function updateIssue(issueId: string, input: UpdateIssueInput) {
  return requestApi<IssueRecordResponse>(issueRecordResponseSchema, {
    data: input,
    method: "PUT",
    url: `/issues/${issueId}`,
  });
}

export function moveIssue(issueId: string, input: MoveIssueInput) {
  return requestApi<IssueRecordResponse>(issueRecordResponseSchema, {
    data: input,
    method: "PUT",
    url: `/issues/${issueId}/move`,
  });
}

export function deleteIssue(issueId: string) {
  return requestApiVoid({ method: "DELETE", url: `/issues/${issueId}` });
}
