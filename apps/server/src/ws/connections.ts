export type BoardConnectionManager = {
  closeBoard: (boardId: string) => void;
  disconnectUser: (input: { boardIds: string[]; userId: string }) => void;
};
