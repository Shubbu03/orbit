import {
  boardResponseSchema,
  boardRecordResponseSchema,
  boardsResponseSchema,
  createBoardResponseSchema,
  type BoardResponse,
  type BoardRecordResponse,
  type BoardsResponse,
  type CreateBoardInput,
  type CreateBoardResponse,
  type UpdateBoardInput,
} from "@orbit/contracts/entities";

import { requestApi, requestApiVoid } from "@/lib/api/client";

const BOARDS_PAGE_SIZE = 24;

export const boardKeys = {
  all: ["boards"] as const,
  allList: ["boards", "all"] as const,
  detail: (boardId: string) => ["boards", boardId] as const,
  list: (organisationId: string) =>
    ["boards", "organisation", organisationId] as const,
};

export function listAllBoards(offset: number) {
  return requestApi<BoardsResponse>(boardsResponseSchema, {
    method: "GET",
    params: { limit: BOARDS_PAGE_SIZE, offset },
    url: "/boards",
  });
}

export function getBoard(boardId: string) {
  return requestApi<BoardResponse>(boardResponseSchema, {
    method: "GET",
    url: `/boards/${boardId}`,
  });
}

export function listBoards(organisationId: string, offset: number) {
  return requestApi<BoardsResponse>(boardsResponseSchema, {
    method: "GET",
    params: {
      limit: BOARDS_PAGE_SIZE,
      offset,
      organisationId,
    },
    url: "/boards",
  });
}

export function createBoard(input: CreateBoardInput) {
  return requestApi<CreateBoardResponse>(createBoardResponseSchema, {
    data: input,
    method: "POST",
    url: "/boards",
  });
}

export function updateBoard(boardId: string, input: UpdateBoardInput) {
  return requestApi<BoardRecordResponse>(boardRecordResponseSchema, {
    data: input,
    method: "PUT",
    url: `/boards/${boardId}`,
  });
}

export function deleteBoard(boardId: string) {
  return requestApiVoid({
    method: "DELETE",
    url: `/boards/${boardId}`,
  });
}
