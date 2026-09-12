import { HONORS, NUMBERS, type TileId } from "./tile";
export class ParseError extends Error {
  constructor(
    message: string,
    public position: number,
  ) {
    super(`第 ${position + 1} 字：${message}`);
  }
}
export function parseTiles(text: string): TileId[] {
  const tiles: TileId[] = [];
  let digits: { n: number; position: number }[] = [];
  const suits: Record<string, number> = {
    m: 0,
    萬: 0,
    万: 0,
    p: 9,
    筒: 9,
    餅: 9,
    s: 18,
    索: 18,
    條: 18,
    条: 18,
    z: 27,
    字: 27,
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/\s|[,，/、]/u.test(char)) continue;
    const digit = /[1-9]/u.test(char)
      ? Number(char)
      : NUMBERS.indexOf(char) + 1;
    if (digit > 0) {
      digits.push({ n: digit, position: i });
      continue;
    }
    const base = suits[char.toLowerCase()];
    if (base !== undefined) {
      if (!digits.length) throw new ParseError("花色前缺少數字", i);
      for (const { n, position } of digits) {
        if (base === 27 && n > 7)
          throw new ParseError("字牌只接受 1～7（東南西北白發中）", position);
        tiles.push(base + n - 1);
      }
      digits = [];
      continue;
    }
    const honor = HONORS.indexOf(
      (char === "发" ? "發" : char) as (typeof HONORS)[number],
    );
    if (honor >= 0) {
      if (digits.length)
        throw new ParseError(
          "數字後缺少萬／筒／索／字花色",
          digits[0].position,
        );
      tiles.push(27 + honor);
      continue;
    }
    throw new ParseError(`無法辨識「${char}」`, i);
  }
  if (digits.length) throw new ParseError("數字後缺少花色", digits[0].position);
  return tiles;
}
