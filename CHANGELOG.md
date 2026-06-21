# Changelog

版本格式：`YYYYMMDD_NN`（NN 為全域單調遞增計數器，每次發佈 +1，跨日不重置）。

## 20260621_05 — 全螢幕版面優化（車資為主角）

- 全螢幕橫向：車資放大至約螢幕高 44%（原 25%），成為主角；計時靠左垂直置中。
- 移除原本上下約 95px 的空白間距（space-between 改 flex 撐滿 + 緊湊底部資訊帶）。
- 加入 safe-area insets，避免瀏海/Home 指示條遮住內容。

## 20260621_04 — 橫向重疊修正 + 計費閃點 + 即時車速

- 修正橫向「計費中」狀態與車資重疊：狀態移到計時上方，車資略縮以防碰撞。
- 計費中時車資旁的黑點閃動（像真機跳錶指示）。
- GPS 區除訊號格外，加顯示「時速」（即時車速 km/h），與「均速」並列。

## 20260621_03 — 全螢幕營業模式（橫向跳表）

- 新增「全螢幕營業模式」：綠底跳表填滿整個螢幕、橫向呈現，像真機。
- 手機直握時自動將跳表轉 90° 填滿螢幕（CSS rotate），橫握則自然填滿；字級用 vmin 隨螢幕放大。
- 進入時嘗試 Fullscreen API + 鎖定橫向（best-effort，不支援的瀏覽器仍以 CSS 旋轉呈現）。
- 右上 ✕ 退出；全螢幕時點收據即關閉。

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
