// 由 public/icon.svg 產生 PWA / iOS 用的 PNG 圖示。
// 一次性工具：執行 `node scripts/gen-icons.mjs`（需 devDependency sharp）。
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const svg = readFileSync(resolve(root, "public/icon-src.svg"));
const targets = [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of targets) {
  await sharp(svg, { density: 512 })
    .resize(size, size, { fit: "contain", background: { r: 21, g: 23, b: 26, alpha: 1 } })
    .png()
    .toFile(resolve(root, "public", name));
  console.log("wrote", name, size + "x" + size);
}
