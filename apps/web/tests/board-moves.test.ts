import assert from "node:assert/strict";
import { test } from "node:test";
import type { BoardDetails } from "@orbit/contracts/entities";
import {
  applyBoardMove,
  BoardMoveQueue,
  type BoardMove,
  type MoveQueueState,
} from "../features/boards/model/board-moves";

const timestamp = "2026-09-05T00:00:00.000Z";
function fixture(): BoardDetails {
  return {
    id: "board",
    organisationId: "org",
    role: "admin",
    title: "Delivery",
    createdAt: timestamp,
    updatedAt: timestamp,
    sections: ["upcoming", "progress", "done"].map((id, position) => ({
      id,
      boardId: "board",
      title: id,
      position,
      createdAt: timestamp,
      updatedAt: timestamp,
      issues: (id === "upcoming"
        ? ["a", "b", "c"]
        : id === "progress"
          ? ["d"]
          : []
      ).map((issueId, index) => ({
        id: issueId,
        boardId: "board",
        sectionId: id,
        title: issueId,
        description: "",
        position: index,
        assignees: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    })),
  };
}
function ids(board: BoardDetails, sectionId: string) {
  return board.sections
    .find((section) => section.id === sectionId)!
    .issues.map((issue) => issue.id);
}
function verifyPositions(board: BoardDetails) {
  for (const section of board.sections) {
    section.issues.forEach((issue, index) => {
      assert.equal(issue.position, index);
      assert.equal(issue.sectionId, section.id);
    });
  }
  const all = board.sections.flatMap((section) => section.issues);
  assert.equal(new Set(all.map((issue) => issue.id)).size, 4);
}
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

for (const [name, move, expected] of [
  [
    "downward reorder",
    { type: "issue", issueId: "a", sectionId: "upcoming", position: 2 },
    ["b", "c", "a"],
  ],
  [
    "upward reorder",
    { type: "issue", issueId: "c", sectionId: "upcoming", position: 0 },
    ["c", "a", "b"],
  ],
  [
    "drop at end",
    { type: "issue", issueId: "a", sectionId: "upcoming", position: 3 },
    ["b", "c", "a"],
  ],
] satisfies [string, BoardMove, string[]][]) {
  void test(name, () => {
    const before = fixture();
    const moved = applyBoardMove(before, move);
    assert.deepEqual(ids(moved, "upcoming"), expected);
    assert.deepEqual(ids(before, "upcoming"), ["a", "b", "c"]);
    assert.equal(
      moved.sections[1],
      before.sections[1],
      "unaffected columns retain identity",
    );
    verifyPositions(moved);
  });
}

void test("cross-list moves insert before a card and into an empty list", () => {
  let board = applyBoardMove(fixture(), {
    type: "issue",
    issueId: "b",
    sectionId: "progress",
    position: 0,
  });
  assert.deepEqual(ids(board, "progress"), ["b", "d"]);
  assert.deepEqual(ids(board, "upcoming"), ["a", "c"]);
  board = applyBoardMove(board, {
    type: "issue",
    issueId: "b",
    sectionId: "done",
    position: 100,
  });
  assert.deepEqual(ids(board, "progress"), ["d"]);
  assert.deepEqual(ids(board, "done"), ["b"]);
  verifyPositions(board);
});

void test("list reorder preserves cards and rejects stale destinations", () => {
  const before = fixture();
  const after = applyBoardMove(before, {
    type: "section",
    sectionId: "done",
    position: 0,
  });
  assert.deepEqual(
    after.sections.map((section) => section.id),
    ["done", "upcoming", "progress"],
  );
  assert.deepEqual(
    after.sections.map((section) => section.position),
    [0, 1, 2],
  );
  verifyPositions(after);
  assert.equal(
    applyBoardMove(before, {
      type: "issue",
      issueId: "b",
      sectionId: "deleted",
      position: 0,
    }),
    before,
  );
  assert.equal(
    applyBoardMove(before, {
      type: "issue",
      issueId: "deleted",
      sectionId: "done",
      position: 0,
    }),
    before,
  );
});

void test("rapid moves render before the network responds and persist in gesture order", async () => {
  let board = fixture();
  let state: MoveQueueState = { pending: [], error: null };
  const first = deferred();
  const second = deferred();
  const completed = deferred();
  const requests: BoardMove[] = [];
  const queue = new BoardMoveQueue({
    persist: (move) => {
      requests.push(move);
      return requests.length === 1 ? first.promise : second.promise;
    },
    commit: (move) => {
      board = applyBoardMove(board, move);
    },
    changed: (next) => {
      state = next;
    },
    settled: completed.resolve,
  });
  queue.enqueue({
    type: "issue",
    issueId: "a",
    sectionId: "progress",
    position: 0,
  });
  queue.enqueue({
    type: "issue",
    issueId: "a",
    sectionId: "done",
    position: 0,
  });
  assert.deepEqual(ids(state.pending.reduce(applyBoardMove, board), "done"), [
    "a",
  ]);
  assert.equal(requests.length, 1, "do not race server reorder transactions");
  first.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(requests.length, 2);
  assert.deepEqual(ids(state.pending.reduce(applyBoardMove, board), "done"), [
    "a",
  ]);
  second.resolve();
  await completed.promise;
  assert.deepEqual(ids(board, "done"), ["a"]);
  assert.equal(state.pending.length, 0);
  verifyPositions(board);
});

void test("a rejected move rolls back only itself while a later move survives", async () => {
  let board = fixture();
  let state: MoveQueueState = { pending: [], error: null };
  const first = deferred();
  const second = deferred();
  const completed = deferred();
  let calls = 0;
  const queue = new BoardMoveQueue({
    persist: () => (++calls === 1 ? first.promise : second.promise),
    commit: (move) => {
      board = applyBoardMove(board, move);
    },
    changed: (next) => {
      state = next;
    },
    settled: completed.resolve,
  });
  queue.enqueue({
    type: "issue",
    issueId: "a",
    sectionId: "progress",
    position: 0,
  });
  queue.enqueue({
    type: "issue",
    issueId: "b",
    sectionId: "done",
    position: 0,
  });
  first.reject(new Error("Offline"));
  await new Promise<void>((resolve) => setImmediate(resolve));
  const visible = state.pending.reduce(applyBoardMove, board);
  assert.deepEqual(ids(visible, "upcoming"), ["a", "c"]);
  assert.deepEqual(ids(visible, "done"), ["b"]);
  assert.equal(state.error, "Offline");
  second.resolve();
  await completed.promise;
  assert.deepEqual(ids(board, "done"), ["b"]);
  assert.deepEqual(ids(board, "progress"), ["d"]);
  verifyPositions(board);
});
