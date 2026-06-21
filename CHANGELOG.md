# Changelog

版本格式：`YYYYMMDD_NN`（NN 為全域單調遞增計數器，每次發佈 +1，跨日不重置）。

## 20260621_02 — GPS 訊號顯示 + PNG 圖示 + 費率設定 UI

- GPS 狀態強化：訊號格(▮▮▮)＋精度公尺數，未定位顯示「定位中…」(閃爍)，弱/斷號變色；直向橫向都有。
- 高速公路燈號移到燈列最右側；上車時間移到頂列。
- PNG 圖示：由 SVG 產生 192/512/apple-touch(180)，七段字「85」改為向量(免字型)；manifest 加入 PNG(含 maskable)、iOS apple-touch-icon 用 PNG。
- 費率設定 UI：設定面板可即時調整起跳/續程/延滯/夜間/春節/過路費，存 localStorage，附「還原預設」。
- `scripts/gen-icons.mjs` 一次性圖示產生器（需臨時裝 sharp）。

## 20260621_01 — 修正 Zeabur 部署服務埠

- nginx 改監聽 8080（Zeabur 預設 HTTP 服務埠），Dockerfile `EXPOSE 8080`。
- 修正初次部署 502/404（gateway 綁定 8080、nginx 卻監聽 80）。

## 20260621_00 — 初版骨架

- 專案建立：Vite + TypeScript（strict）+ vite-plugin-pwa。
- 計費核心 `src/fare.ts`：北北基運價（起跳 85 / 續程 200m·5 / 延滯 60s·5 / 夜間 +20 / 春節 +30 / 過路費 1.2/km），費率設定檔化。
- GPS 模組 `src/geo.ts`：watchPosition + Haversine + 速度估算 + 濾波 + Wake Lock。
- 高速自動偵測 `src/highway.ts`：速度啟發式，可手動覆寫。
- 趟次狀態與今日統計 `src/state.ts`：localStorage 持久化。
- 綠底 LCD UI：DSEG7 七段字體（自帶 woff2 離線可用）、直向 / 橫向版面、即時時鐘、燈號、收據。
- 室內模擬模式（時速滑桿）方便測試跳表邏輯。
- PWA（manifest + service worker，離線可用）、Docker（nginx）部署設定。
