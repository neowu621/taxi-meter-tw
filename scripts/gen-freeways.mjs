// 從 OpenStreetMap (Overpass) 抓台灣國道(motorway) 線形，簡化後輸出 public/freeways.json。
// 一次性工具：`node scripts/gen-freeways.mjs`。離線圖資供高速公路自動偵測使用。
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BBOX = "21.85,120.0,25.35,122.05"; // 台灣本島
const QUERY = `[out:json][timeout:180];
(
  way["highway"="motorway"](${BBOX});
  way["highway"="motorway_link"](${BBOX});
);
out geom;`;

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const HEADERS = {
  "User-Agent": "taxi-meter-tw/1.0 (neowu62@gmail.com)",
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};

// 點到線(度，近似平面)的垂直距離，單位公尺
const MID_LAT = 23.7;
const M_PER_DEG_LAT = 111320;
const M_PER_DEG_LNG = 111320 * Math.cos((MID_LAT * Math.PI) / 180);
function toXY(p) {
  return [p[1] * M_PER_DEG_LNG, p[0] * M_PER_DEG_LAT];
}
function perpDist(p, a, b) {
  const [px, py] = toXY(p), [ax, ay] = toXY(a), [bx, by] = toXY(b);
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// Douglas-Peucker（eps 公尺）
function rdp(points, eps) {
  if (points.length < 3) return points;
  let dmax = 0, idx = 0;
  const s = points[0], e = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], s, e);
    if (d > dmax) { dmax = d; idx = i; }
  }
  if (dmax > eps) {
    return rdp(points.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(points.slice(idx), eps));
  }
  return [s, e];
}

async function fetchOverpass() {
  for (const url of ENDPOINTS) {
    try {
      console.log("fetch", url);
      const res = await fetch(url, {
        method: "POST",
        headers: HEADERS,
        body: "data=" + encodeURIComponent(QUERY),
      });
      if (!res.ok) { console.log("  HTTP", res.status); continue; }
      return await res.json();
    } catch (e) {
      console.log("  failed:", e.message);
    }
  }
  throw new Error("all overpass endpoints failed");
}

const data = await fetchOverpass();
const ways = data.elements.filter((el) => el.type === "way" && el.geometry);
console.log("ways:", ways.length);

let rawPts = 0, outPts = 0;
const lines = [];
for (const w of ways) {
  const pts = w.geometry.map((g) => [g.lat, g.lon]);
  rawPts += pts.length;
  const simp = rdp(pts, 25).map(([lat, lng]) => [
    Math.round(lat * 1e5) / 1e5,
    Math.round(lng * 1e5) / 1e5,
  ]);
  if (simp.length >= 2) { lines.push(simp); outPts += simp.length; }
}

const out = resolve(process.cwd(), "public/freeways.json");
const json = JSON.stringify(lines);
writeFileSync(out, json);
console.log(`lines: ${lines.length}, points: ${rawPts} -> ${outPts}`);
console.log(`wrote ${out} (${(json.length / 1024).toFixed(1)} KB)`);
