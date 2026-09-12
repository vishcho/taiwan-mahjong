import {
  cloneBoard,
  structuralCount,
  type Board,
  type Meld,
  type Discard,
} from "./model";
/** All mutations produce an independent snapshot, including link repair. */
export function addMeld(
  board: Board,
  meld: Meld,
  consumeConcealed = false,
): Board {
  const next = cloneBoard(board);
  if (next.melds.some((m) => m.id === meld.id))
    throw new Error("副露 ID 已存在");
  if (meld.calledDiscardId) {
    const d = next.discards.find((d) => d.id === meld.calledDiscardId);
    if (
      !d ||
      d.calledMeldId ||
      d.player !== meld.calledFrom ||
      !meld.tiles.includes(d.tile)
    )
      throw new Error("捨牌已被叫走或與副露不符");
    d.calledMeldId = meld.id;
  }
  if (consumeConcealed && meld.owner === 0) {
    const consumed = [...meld.tiles];
    if (meld.calledDiscardId)
      consumed.splice(
        consumed.indexOf(
          next.discards.find((d) => d.id === meld.calledDiscardId)!.tile,
        ),
        1,
      );
    for (const t of consumed) {
      const i = next.concealed.indexOf(t);
      if (i < 0) throw new Error("暗手沒有足夠的牌可組成副露");
      next.concealed.splice(i, 1);
    }
  }
  next.melds.push(cloneBoard({ ...next, melds: [meld] }).melds[0]);
  delete next.drawnTile;
  return next;
}
export function removeMeld(board: Board, id: string): Board {
  const next = cloneBoard(board);
  next.melds = next.melds.filter((m) => m.id !== id);
  next.discards.forEach((d) => {
    if (d.calledMeldId === id) delete d.calledMeldId;
  });
  delete next.drawnTile;
  return next;
}
export function removeDiscard(board: Board, id: string): Board {
  const next = cloneBoard(board);
  next.melds.forEach((m) => {
    if (m.calledDiscardId === id) delete m.calledDiscardId;
  });
  next.discards = next.discards.filter((d) => d.id !== id);
  return next;
}
export function updateDiscard(
  board: Board,
  id: string,
  changes: Pick<Discard, "tile" | "player" | "tsumogiri">,
): Board {
  const next = cloneBoard(board);
  const discard = next.discards.find((d) => d.id === id);
  if (!discard) throw new Error("找不到捨牌");
  if (
    discard.calledMeldId &&
    (discard.tile !== changes.tile || discard.player !== changes.player)
  ) {
    const meld = next.melds.find((m) => m.id === discard.calledMeldId);
    if (meld) {
      delete meld.calledDiscardId;
      delete meld.calledFrom;
    }
    delete discard.calledMeldId;
  }
  Object.assign(discard, changes);
  return next;
}
export function normalizeDrawn(board: Board): Board {
  if (
    structuralCount(board) !== 17 ||
    !board.concealed.includes(board.drawnTile ?? -1)
  )
    delete board.drawnTile;
  return board;
}
