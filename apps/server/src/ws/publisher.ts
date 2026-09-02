import type { PublishedBoardEvent } from "./protocol";

export type BoardEventPublisher = {
  publish: (event: PublishedBoardEvent) => void;
};
