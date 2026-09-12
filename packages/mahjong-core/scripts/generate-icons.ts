import { readFile, writeFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
const svg = await readFile("app/public/icon.svg", "utf8");
for (const size of [192, 512]) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  await writeFile(`app/public/icon-${size}.png`, png);
}
