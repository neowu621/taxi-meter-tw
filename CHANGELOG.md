# Changelog

版本格式：`YYYYMMDD_NN`（NN 為全域單調遞增計數器，每次發佈 +1，跨日不重置）。

## 20260621_00 — 初版骨架

- 專案建立：Vite + TypeScript（strict）+ vite-plugin-pwa。
- 計費核心 `src/fare.ts`：北北基運價（起跳 85 / 續程 200m·5 / 延滯 60s·5 / 夜間 +20 / 春節 +30 / 過路費 1.2/km），費率設定檔化。
- GPS 模組 `src/geo.ts`：watchPosition + Haversine + 速度估算 + 濾波 + Wake Lock。
- 高速自動偵測 `src/highway.ts`：速度啟發式，可手動覆寫。
- 趟次狀態與今日統計 `src/state.ts`：localStorage 持久化。
- 綠底 LCD UI：DSEG7 七段字體（自帶 woff2 離線可用）、直向 / 橫向版面、即時時鐘、燈號、收據。
- 室內模擬模式（時速滑桿）方便測試跳表邏輯。
- PWA（manifest + service worker，離線可用）、Docker（nginx）部署設定。
