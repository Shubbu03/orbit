import {
  assignmentResponseSchema,
  type AssignmentResponse,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

export function assignIssue(issueId: string, userId: string) {
  return requestApi<AssignmentResponse>(assignmentResponseSchema, {
    data: { userId },
    method: "POST",
    url: `/issues/${issueId}/assignees`,
  });
}

export function unassignIssue(issueId: string, userId: string) {
  return requestApiVoid({
    method: "DELETE",
    url: `/issues/${issueId}/assignees/${encodeURIComponent(userId)}`,
  });
}
