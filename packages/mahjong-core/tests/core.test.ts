import { describe, expect, it } from "vitest";
import fixtures from "../../../testdata/shanten/golden.json";
import {
  Analyzer,
  addMeld,
  cloneBoard,
  countsOf,
  decodeBoard,
  emptyBoard,
  encodeBoard,
  isWinning,
  ownMelds,
  parseTiles,
  referenceShanten,
  removeDiscard,
  removeMeld,
  targetShanten,
  tileName,
  updateDiscard,
  validateBoard,
  type Board,
} from "../src/index";
import { loadEngine } from "./helpers";
const engine = loadEngine();
const boardOf = (text: string): Board => ({
  ...emptyBoard(),
  concealed: parseTiles(text),
});
describe("parser and validation", () => {
  it("normalizes Chinese, notation and mixed input", () => {
    expect(parseTiles("一二三萬 456筒 七八九索 東南西北白發中")).toEqual(
      parseTiles("123m456p789s1234567z"),
    );
    expect(() => parseTiles("123m8z")).toThrow("第 5 字");
    expect(() => parseTiles("12東")).toThrow("第 1 字");
  });
  it("counts called discards once and repairs removals", () => {
    const board = boardOf("123456m789p12345s77z");
    board.discards.push({ id: "d1", tile: 27, player: 2 });
    const linked = addMeld(board, {
      id: "m1",
      owner: 1,
      type: "pon",
      tiles: [27, 27, 27],
      calledFrom: 2,
      calledDiscardId: "d1",
    });
    expect(validateBoard(linked).known[27]).toBe(3);
    expect(validateBoard(linked).status).toBe("valid");
    expect(validateBoard(removeMeld(linked, "m1")).known[27]).toBe(1);
    expect(validateBoard(removeDiscard(linked, "d1")).known[27]).toBe(3);
    const changed = updateDiscard(linked, "d1", {
      tile: 28,
      player: 2,
      tsumogiri: true,
    });
    expect(validateBoard(changed).status).toBe("valid");
    expect(changed.melds[0].calledDiscardId).toBeUndefined();
    linked.discards[0].tile = 28;
    expect(validateBoard(linked).issues.some((i) => i.code === "link")).toBe(
      true,
    );
  });
  it("validates kan physical/structural counts and flowers", () => {
    const board = boardOf("123456m789p12s77z");
    board.melds.push({
      id: "kan",
      owner: 0,
      type: "closed-kan",
      tiles: [27, 27, 27, 27],
    });
    expect(validateBoard(board)).toMatchObject({
      status: "valid",
      structuralCount: 16,
    });
    expect(validateBoard(board).remaining[27]).toBe(0);
    const before = new Analyzer(board, engine).analyze();
    board.flowers.push({ tile: 0, owner: 0 });
    expect(new Analyzer(board, engine).analyze().current).toEqual(
      before.current,
    );
    board.concealed.push(27);
    expect(
      validateBoard(board).issues.find((i) => i.code === "count")?.message,
    ).toContain("共輸入 5 張");
    expect(new Analyzer(board, engine).analyze().mode).toBe("invalid");
  });
  it("retains incomplete and malformed input without normal results", () => {
    expect(new Analyzer(boardOf("123m"), engine).analyze().mode).toBe(
      "editing",
    );
    const b = boardOf("11111m");
    expect(new Analyzer(b, engine).analyze().mode).toBe("invalid");
  });
});
describe("shanten and winning", () => {
  for (const f of fixtures)
    it(f.name, () => {
      const counts = countsOf(parseTiles(f.hand));
      expect(engine.shanten(counts)).toBe(f.expected);
      expect(targetShanten(counts)).toBe(f.expected);
      expect(isWinning(counts)).toBe(f.expected === -1);
      if (f.formula !== undefined)
        expect(referenceShanten(counts).shanten).toBe(f.formula);
      const result = referenceShanten(counts);
      for (const decomposition of result.bestDecompositions)
        expect(countsOf(decomposition.groups.flatMap((g) => g.tiles))).toEqual(
          counts,
        );
    });
  it("does not recommend discards for a won hand", () => {
    const result = new Analyzer(boardOf(fixtures[0].hand), engine).analyze();
    expect(result.mode).toBe("won");
    expect(result.discardOptions).toEqual([]);
  });
  it("respects the four-copy limit including fixed melds", () => {
    const fixed = countsOf(parseTiles("111z"));
    const hand = countsOf(parseTiles("123456m789p123s1z"));
    expect(engine.shanten(hand, 1, fixed)).toBe(1);
    expect(targetShanten(hand, 1, fixed)).toBe(1);
  });
});
describe("real analysis", () => {
  it("computes the selected design example, without mutating input", () => {
    const board = boardOf("1234569m789p12345s77z");
    const original = cloneBoard(board);
    const analyzer = new Analyzer(board, engine);
    const result = analyzer.analyze();
    expect(result.discardOptions[0]).toMatchObject({
      tile: 8,
      best: true,
      shanten: 0,
      ukeire: 7,
      kinds: 2,
      effectiveTiles: [
        { tile: 20, remaining: 3 },
        { tile: 23, remaining: 4 },
      ],
    });
    expect(analyzer.detail(8).efficiency).toMatchObject({
      ukeire: 7,
      shanten: 0,
    });
    expect(board).toEqual(original);
  });
  it("changes actual ukeire with public information and preserves zero waits", () => {
    const board = boardOf("123456m789p12345s77z");
    for (let i = 0; i < 3; i++)
      board.discards.push({ id: `a${i}`, tile: 20, player: 1 });
    for (let i = 0; i < 4; i++)
      board.discards.push({ id: `b${i}`, tile: 23, player: 2 });
    const current = new Analyzer(board, engine).analyze().current!;
    expect(current).toMatchObject({
      shanten: 0,
      ukeire: 0,
      kinds: 0,
      exhaustedTiles: [20, 23],
    });
  });
  it("verifies effective draws against explicit legal discards and direct winning", () => {
    const board = boardOf("123456m78p12345s177z");
    const analyzer = new Analyzer(board, engine);
    const result = analyzer.analyze().current!;
    expect(result.shanten).toBe(1);
    for (const entry of result.effectiveTiles) {
      const hand = countsOf(board.concealed);
      hand[entry.tile]++;
      let best = 10;
      for (let d = 0; d < 34; d++)
        if (hand[d]) {
          hand[d]--;
          best = Math.min(best, engine.shanten(hand));
          hand[d]++;
        }
      expect(best, tileName(entry.tile)).toBeLessThan(result.shanten);
    }
  });
  it("improvement simulation consumes the draw and never returns a discard to the pool", () => {
    const board = boardOf("123456m789p12346s77z");
    const analyzer = new Analyzer(board, engine);
    const detail = analyzer.detail();
    expect(detail.improvementTiles.length).toBeGreaterThan(0);
    for (const improvement of detail.improvementTiles) {
      const hand = countsOf(board.concealed);
      hand[improvement.drawTile]++;
      const pool = [...analyzer.validation.remaining];
      pool[improvement.drawTile]--;
      const options = analyzer.discards(hand, pool);
      expect(options[0].shanten).toBe(detail.efficiency.shanten);
      expect(options[0].ukeire).toBe(improvement.newUkeire);
      expect(improvement.deltaUkeire).toBeGreaterThan(0);
      expect(improvement.bestDiscard).toEqual(
        options.filter((o) => o.best).map((o) => o.tile),
      );
    }
    expect(ownMelds(board)).toEqual([]);
  });
});
describe("versioned share codec", () => {
  it("round trips all public details and recomputes the same result", () => {
    const board = boardOf("1234569m789p12345s77z");
    board.drawnTile = 8;
    board.flowers.push({ tile: 2, owner: 3 });
    board.discards.push({ id: "d", tile: 27, player: 1, tsumogiri: true });
    const next = addMeld(board, {
      id: "m",
      owner: 2,
      tiles: [27, 27, 27],
      type: "pon",
      calledDiscardId: "d",
      calledFrom: 1,
    });
    const token = encodeBoard(next);
    expect(decodeBoard(token)).toEqual(next);
    expect(new Analyzer(decodeBoard(token), engine).analyze()).toEqual(
      new Analyzer(next, engine).analyze(),
    );
    expect(() => decodeBoard(token.replace(/^1\./, "2."))).toThrow("版本");
    expect(() => decodeBoard(token.slice(0, -4))).toThrow();
    expect(() => decodeBoard("1." + "a".repeat(100000))).toThrow("過大");
  });
});
