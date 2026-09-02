type OrderedItem = {
  id: string;
};

export function reorderItems<T extends OrderedItem>(
  items: readonly T[],
  movedItemId: string,
  requestedPosition: number,
) {
  const movedItem = items.find((item) => item.id === movedItemId);

  if (!movedItem) {
    return null;
  }

  const remainingItems = items.filter((item) => item.id !== movedItemId);
  const position = Math.min(requestedPosition, remainingItems.length);

  return {
    items: [
      ...remainingItems.slice(0, position),
      movedItem,
      ...remainingItems.slice(position),
    ],
    position,
  };
}
