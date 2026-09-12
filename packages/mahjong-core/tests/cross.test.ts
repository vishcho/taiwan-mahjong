import { expect, it } from "vitest";
import { referenceShanten, targetShanten, type TileCounts } from "../src/index";
import { loadEngine, loadFormula } from "./helpers";
it("seeded complete hands agree with independent target DP; formula agrees with full DFS", () => {
  const engine = loadEngine(),
    formula = loadFormula();
  let seed = 0x16_2026;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const total = Number(process.env.CROSS_COUNT ?? 100);
  for (let sample = 0; sample < total; sample++) {
    const counts: TileCounts = new Uint8Array(34);
    const n = 16 + (sample % 2);
    for (let i = 0; i < n;) {
      const tile = Math.floor(random() * 34);
      if (counts[tile] < 4) {
        counts[tile]++;
        i++;
      }
    }
    expect(formula.shanten(counts), `formula ${sample}`).toBe(
      referenceShanten(counts, 0, 0).shanten,
    );
    expect(engine.shanten(counts), `target ${sample}: ${[...counts]}`).toBe(
      targetShanten(counts),
    );
  }
});
