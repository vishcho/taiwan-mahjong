import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { DistanceEngine, LookupEngine, type TableManifest } from "../src/index";
export function loadEngine() {
  const manifest = JSON.parse(
    readFileSync("app/public/tables/distance-manifest.json", "utf8"),
  ) as TableManifest;
  const read = (kind: "suit" | "honors") =>
    new Uint8Array(
      gunzipSync(readFileSync(`app/public/tables/${manifest[kind].file}`)),
    );
  return new DistanceEngine({ suit: read("suit"), honors: read("honors") });
}
export function loadFormula() {
  const manifest = JSON.parse(
    readFileSync("app/public/tables/manifest.json", "utf8"),
  ) as TableManifest;
  const read = (kind: "suit" | "honors") =>
    new Int8Array(
      gunzipSync(readFileSync(`app/public/tables/${manifest[kind].file}`)),
    );
  return new LookupEngine({ suit: read("suit"), honors: read("honors") });
}
