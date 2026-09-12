import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { Analyzer, emptyBoard, parseTiles } from "../src/index";
import { loadEngine } from "../tests/helpers";
const start = performance.now();
const engine = loadEngine();
const initializationMs = performance.now() - start;
const fixtures = [
  "123456m789p12345s77z",
  "1234569m789p12345s77z",
  "1122334455667788m",
  "147m258p369s1234566z",
];
const benchmarks = fixtures.map((hand) => {
  const samples: number[] = [];
  let options = 0;
  for (let i = 0; i < 12; i++) {
    const analyzer = new Analyzer(
      { ...emptyBoard(), concealed: parseTiles(hand) },
      engine,
    );
    const start = performance.now();
    const result = analyzer.analyze();
    options = result.discardOptions.length;
    if (result.mode === "discard")
      for (const option of result.discardOptions) analyzer.detail(option.tile);
    else if (result.mode === "draw") analyzer.detail();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return {
    hand,
    candidates: options,
    medianMs: samples[6],
    p95Ms: samples[11],
  };
});
const report = {
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  initializationMs,
  heapUsedBytes: process.memoryUsage().heapUsed,
  benchmarks,
};
console.log(JSON.stringify(report, null, 2));
writeFileSync("output/benchmark.json", JSON.stringify(report, null, 2) + "\n");
