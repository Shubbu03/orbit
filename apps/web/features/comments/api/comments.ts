import {
  commentMutationResponseSchema,
  commentsResponseSchema,
  type CommentMutationResponse,
  type CommentsResponse,
  type CreateCommentInput,
  type UpdateCommentInput,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

const COMMENTS_PAGE_SIZE = 50;

export const commentKeys = {
  all: ["comments"] as const,
  issue: (issueId: string) => ["comments", "issue", issueId] as const,
};

export function listComments(issueId: string, offset: number) {
  return requestApi<CommentsResponse>(commentsResponseSchema, {
    method: "GET",
    params: { limit: COMMENTS_PAGE_SIZE, offset },
    url: `/issues/${issueId}/comments`,
  });
}

export function createComment(input: CreateCommentInput) {
  return requestApi<CommentMutationResponse>(commentMutationResponseSchema, {
    data: input,
    method: "POST",
    url: "/comments",
  });
}

export function updateComment(commentId: string, input: UpdateCommentInput) {
  return requestApi<CommentMutationResponse>(commentMutationResponseSchema, {
    data: input,
    method: "PUT",
    url: `/comments/${commentId}`,
  });
}

export function deleteComment(commentId: string) {
  return requestApiVoid({ method: "DELETE", url: `/comments/${commentId}` });
}
