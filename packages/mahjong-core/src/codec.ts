import { deflateSync, Inflate, strFromU8, strToU8 } from "fflate";
import type { Board } from "./model";
const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const MAX_RAW = 65536;
const MAX_COMPRESSED = 16384;
const fail = (message: string): never => {
  throw new Error(message);
};
function base64(data: Uint8Array): string {
  let bits = 0,
    buffer = 0,
    result = "";
  for (const byte of data) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      result += ALPHABET[(buffer >>> bits) & 63];
    }
  }
  if (bits) result += ALPHABET[(buffer << (6 - bits)) & 63];
  return result;
}
function unbase64(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(text) || text.length % 4 === 1)
    fail("分享內容的編碼已毀損");
  const result: number[] = [];
  let bits = 0,
    buffer = 0;
  for (const char of text) {
    buffer = (buffer << 6) | ALPHABET.indexOf(char);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      result.push((buffer >>> bits) & 255);
    }
  }
  const decoded = new Uint8Array(result);
  if (base64(decoded) !== text) fail("分享內容的編碼不完整");
  return decoded;
}
export function checksum(data: Uint8Array): string {
  let hash = 2166136261;
  for (const byte of data) hash = Math.imul(hash ^ byte, 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
/** Shape checks precede domain validation; invalid but editable boards can be shared. */
export function parseBoard(value: unknown): Board {
  if (!record(value) || value.version !== 1) fail("無法讀取盤面版本");
  const b = value as Record<string, unknown>;
  const arrays = ["concealed", "melds", "discards", "flowers"];
  if (
    !arrays.every(
      (k) => Array.isArray(b[k]) && (b[k] as unknown[]).length <= 200,
    )
  )
    fail("盤面資料結構錯誤或過大");
  const isNumber = (n: unknown) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 255;
  const isId = (s: unknown) =>
    typeof s === "string" && s.length > 0 && s.length <= 80;
  const optional = (v: unknown, predicate: (v: unknown) => boolean) =>
    v === undefined || predicate(v);
  if (
    !(b.concealed as unknown[]).every(isNumber) ||
    !optional(b.drawnTile, isNumber)
  )
    fail("暗手資料錯誤");
  for (const m of b.melds as unknown[])
    if (
      !record(m) ||
      !isId(m.id) ||
      !["chi", "pon", "open-kan", "closed-kan"].includes(String(m.type)) ||
      !Array.isArray(m.tiles) ||
      m.tiles.length > 4 ||
      !m.tiles.every(isNumber) ||
      !isNumber(m.owner) ||
      !optional(m.calledFrom, isNumber) ||
      !optional(m.calledDiscardId, isId)
    )
      fail("副露資料錯誤");
  for (const d of b.discards as unknown[])
    if (
      !record(d) ||
      !isId(d.id) ||
      !isNumber(d.tile) ||
      !isNumber(d.player) ||
      !optional(d.calledMeldId, isId) ||
      !optional(d.tsumogiri, (v) => typeof v === "boolean")
    )
      fail("牌河資料錯誤");
  for (const f of b.flowers as unknown[])
    if (!record(f) || !isNumber(f.tile) || !isNumber(f.owner))
      fail("花牌資料錯誤");
  return JSON.parse(JSON.stringify(b)) as Board;
}
export function encodeBoard(board: Board): string {
  const raw = strToU8(JSON.stringify(parseBoard(board)));
  if (raw.length > MAX_RAW) fail("盤面資料過大，無法產生分享連結");
  const data = deflateSync(raw, { level: 9 });
  if (data.length > MAX_COMPRESSED) fail("壓縮後盤面過大");
  return `1.${checksum(raw)}.${base64(data)}`;
}
export function decodeBoard(token: string): Board {
  if (token.length > MAX_COMPRESSED * 1.4) fail("分享連結過大");
  const [version, expected, encoded, extra] = token.split(".");
  if (version !== "1") fail("不支援此分享版本");
  if (!encoded || extra !== undefined || !/^[a-f0-9]{8}$/u.test(expected ?? ""))
    fail("分享連結格式錯誤");
  const data = unbase64(encoded);
  const chunks: Uint8Array[] = [];
  let size = 0;
  const inflater = new Inflate((chunk) => {
    size += chunk.length;
    if (size > MAX_RAW) fail("分享資料解壓後超過大小上限");
    chunks.push(chunk);
  });
  try {
    // Bounded input chunks prevent a zip bomb from allocating an unbounded output chunk.
    for (let at = 0; at < data.length; at += 32)
      inflater.push(data.subarray(at, at + 32), at + 32 >= data.length);
  } catch (error) {
    fail(
      `分享資料無法解壓：${error instanceof Error ? error.message : "資料毀損"}`,
    );
  }
  const raw = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    raw.set(chunk, offset);
    offset += chunk.length;
  }
  if (checksum(raw) !== expected) fail("分享資料校驗失敗，連結可能不完整");
  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(raw));
  } catch {
    fail("分享內容不是有效盤面");
  }
  return parseBoard(parsed);
}
