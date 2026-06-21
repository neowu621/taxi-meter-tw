# Laowu 計程車計費器（自用 / 估價）

手機網頁版計程車跳表，給司機自用或估價參考。純前端 PWA，可加到手機主畫面、離線可用。

> ⚠️ **法規定位**：本工具依手機 GPS 估算車資，**非經濟部標準檢驗局檢定合格之計程車計費器**，不得作為對乘客正式收費的依據。僅供司機自用 / 估價 / 教學參考。

## 功能

- **GPS 里程**：`watchPosition` + Haversine 計距，含基本濾波（精度門檻、跳點過濾）。
- **跳表計費**（北北基 2023-04-01 起運價，可在設定檔調整）：
  - 起跳 1.25 km / 85 元；續程每 200 m / 5 元
  - 延滯計時：車速 < 5 km/h 時每 60 s / 5 元（與續程不雙重計算）
  - 夜間加成（23:00–06:00，依上車時間判定，+20）
  - 春節加成（手動開啟，+30）
- **高速公路**：自動模式用**離線國道圖資**比對 GPS，**確認真的在高速公路上**才亮燈、估算 ETC 過路費（約 1.2 元/km）；圖資未就緒時退回速度啟發式。可手動覆寫（自動·圖資 / 手動開 / 手動關）。圖資由 `scripts/gen-freeways.mjs` 從 OpenStreetMap 產生，延遲載入、SW 快取離線可用。
- **綠底 LCD UI**：七段顯示器字體（DSEG7），直向 / 橫向兩種版面。
- **螢幕常亮**：行車中 Wake Lock 防熄屏。
- **今日統計**：趟次 / 收入累計，存於 localStorage。
- **室內測試**：設定面板可切「模擬」模式，用時速滑桿測跳表邏輯。

## 開發

```bash
npm install
npm run dev      # 本機開發（手機測 GPS 需 https，可用 vite --host + 通道）
npm run build    # 產生 dist/
npm run preview  # 預覽 dist/
```

## 費率設定

費率集中在 [`src/fare.ts`](src/fare.ts) 的 `TAIPEI_RATE`。各縣市調漲時改數字即可；使用者端的覆寫存在 localStorage（`src/state.ts`）。

## 部署

純靜態站，多階段 Docker（Node 建置 → nginx）：見 [`Dockerfile`](Dockerfile)。適用 Zeabur / 任何容器平台。

## 技術

Vite + TypeScript（strict）+ vite-plugin-pwa。無後端、無資料庫。
