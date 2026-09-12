import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  generateTable,
  TABLE_VERSION,
  SLOTS,
  type TableManifest,
} from "../src/table";
import { generateDistanceTable } from "../src/distance";
const dir = new URL("../../../app/public/tables/", import.meta.url);
await mkdir(dir, { recursive: true });
const manifest: TableManifest = {
  version: TABLE_VERSION,
  slots: SLOTS,
  suit: { file: "", bytes: 0, rawBytes: 0, checksum: "" },
  honors: { file: "", bytes: 0, rawBytes: 0, checksum: "" },
};
for (const [kind, length] of [
  ["suit", 9],
  ["honors", 7],
] as const) {
  const data = generateTable(length);
  const checksum = createHash("sha256").update(data).digest("hex");
  const compressed = gzipSync(data, { level: 9 });
  const file = `${kind}-v${TABLE_VERSION}-${checksum.slice(0, 16)}.bin.gz`;
  manifest[kind] = {
    file,
    bytes: compressed.length,
    rawBytes: data.length,
    checksum,
  };
  try {
    const old = await readFile(new URL(file, dir));
    if (createHash("sha256").update(gunzipSync(old)).digest("hex") !== checksum)
      throw new Error("stale");
  } catch {
    await writeFile(new URL(file, dir), compressed);
  }
  console.log(
    `${kind}: ${data.length.toLocaleString()} bytes → gzip ${compressed.length.toLocaleString()} bytes; sha256 ${checksum}`,
  );
}
await writeFile(
  new URL("manifest.json", dir),
  JSON.stringify(manifest, null, 2) + "\n",
);
const distanceManifest = { ...manifest };
for (const [kind, length] of [
  ["suit", 9],
  ["honors", 7],
] as const) {
  const formula = gunzipSync(await readFile(new URL(manifest[kind].file, dir)));
  const data = generateDistanceTable(
    new Int8Array(formula.buffer, formula.byteOffset, formula.byteLength),
    length,
  );
  const checksum = createHash("sha256").update(data).digest("hex");
  const compressed = gzipSync(data, { level: 9 });
  const file = `distance-${kind}-v${TABLE_VERSION}-${checksum.slice(0, 16)}.bin.gz`;
  distanceManifest[kind] = {
    file,
    bytes: compressed.length,
    rawBytes: data.length,
    checksum,
  };
  await writeFile(new URL(file, dir), compressed);
  console.log(
    `distance-${kind}: ${data.length.toLocaleString()} bytes → gzip ${compressed.length.toLocaleString()} bytes; sha256 ${checksum}`,
  );
}
await writeFile(
  new URL("distance-manifest.json", dir),
  JSON.stringify(distanceManifest, null, 2) + "\n",
);
