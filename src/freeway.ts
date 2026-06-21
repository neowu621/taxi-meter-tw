// 離線國道圖資：判斷某 GPS 點是否落在高速公路上（點到線段距離 < 門檻）。
// 資料 public/freeways.json 由 scripts/gen-freeways.mjs 從 OpenStreetMap 產生。
// 延遲載入、不阻塞首屏；首次抓取後由 service worker 快取供離線使用。

interface Line {
  bbox: [number, number, number, number]; // minLat, minLng, maxLat, maxLng
  pts: number[][]; // [[lat,lng],...]
}

let lines: Line[] | null = null;
let loading: Promise<void> | null = null;

const M_PER_DEG_LAT = 111320;

export function loadFreeways(): Promise<void> {
  if (lines) return Promise.resolve();
  if (loading) return loading;
  loading = fetch("freeways.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http " + r.status))))
    .then((data: number[][][]) => {
      lines = data.map((pts) => {
        let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
        for (const [la, ln] of pts) {
          if (la < minLat) minLat = la;
          if (la > maxLat) maxLat = la;
          if (ln < minLng) minLng = ln;
          if (ln > maxLng) maxLng = ln;
        }
        return { bbox: [minLat, minLng, maxLat, maxLng], pts };
      });
    })
    .catch(() => {
      lines = []; // 載入失敗 → 視為無圖資（呼叫端退回速度啟發式）
    });
  return loading;
}

/** 圖資是否已就緒可用。 */
export function freewaysReady(): boolean {
  return lines !== null && lines.length > 0;
}

// 點(原點)到線段 a-b 的平方距離（公尺），局部平面近似
function segDist2(
  plat: number,
  plng: number,
  a: number[],
  b: number[],
  mPerDegLng: number,
): number {
  const ax = (a[1] - plng) * mPerDegLng, ay = (a[0] - plat) * M_PER_DEG_LAT;
  const bx = (b[1] - plng) * mPerDegLng, by = (b[0] - plat) * M_PER_DEG_LAT;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return cx * cx + cy * cy;
}

/** 此 GPS 座標是否在高速公路上（預設門檻 70 公尺）。 */
export function isOnFreeway(lat: number, lng: number, thresholdM = 70): boolean {
  if (!lines || lines.length === 0) return false;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
  const dLat = thresholdM / M_PER_DEG_LAT;
  const dLng = thresholdM / mPerDegLng;
  const th2 = thresholdM * thresholdM;
  for (const line of lines) {
    const b = line.bbox;
    if (lat < b[0] - dLat || lat > b[2] + dLat || lng < b[1] - dLng || lng > b[3] + dLng) continue;
    const pts = line.pts;
    for (let i = 1; i < pts.length; i++) {
      if (segDist2(lat, lng, pts[i - 1], pts[i], mPerDegLng) < th2) return true;
    }
  }
  return false;
}
