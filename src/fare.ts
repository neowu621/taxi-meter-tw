// 費率設定檔 + 純計費邏輯（無副作用，方便測試）。
// 預設大台北（北北基）；其餘各縣市為參考值，可在設定中調整。
// 各縣市調漲時，改 REGIONS 數字即可。

export interface RateConfig {
  /** 起跳價（元） */
  baseFare: number;
  /** 起跳涵蓋距離（公尺） */
  baseDistance: number;
  /** 續程跳錶間距（公尺） */
  stepDistance: number;
  /** 每次續程/延滯跳錶金額（元） */
  stepFare: number;
  /** 低於此車速（km/h）改用延滯計時 */
  slowSpeedKmh: number;
  /** 延滯計時每滿幾秒跳一次 */
  slowStepSec: number;
  /** 夜間加成（固定金額，元/趟）；若用百分比則設 0 */
  nightSurcharge: number;
  /** 夜間加成（百分比，對里程車資加成）；若用固定金額則設 0 */
  nightPct: number;
  /** 夜間時段起（含），24h */
  nightStartHour: number;
  /** 夜間時段迄（不含），24h */
  nightEndHour: number;
  /** 春節加成（元/趟），由使用者手動開啟 */
  cnySurcharge: number;
  /** 國道計程過路費估算（元/公里，小客車約 1.2） */
  tollPerKm: number;
}

export interface RegionRate extends RateConfig {
  key: string;
  name: string;
}

// 共用預設（夜間 23–06、春節 +30、過路費 1.2/km）
const COMMON = {
  slowSpeedKmh: 5,
  nightStartHour: 23,
  nightEndHour: 6,
  cnySurcharge: 30,
  tollPerKm: 1.2,
};

// 各縣市費率（北北基為主，其餘為參考值；夜間 pct 者為「車程 +2 成」）
export const REGIONS: RegionRate[] = [
  { key: "taipei", name: "大台北（北北基）", baseFare: 85, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 60, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "taoyuan", name: "桃園市", baseFare: 95, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 150, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "hsinchu", name: "新竹縣市", baseFare: 100, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "miaoli", name: "苗栗縣", baseFare: 100, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "taichung", name: "台中市", baseFare: 85, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 60, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "changhua", name: "彰化縣", baseFare: 100, baseDistance: 1500, stepDistance: 200, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "nantou", name: "南投縣", baseFare: 85, baseDistance: 1500, stepDistance: 200, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "yunlin", name: "雲林縣", baseFare: 100, baseDistance: 1250, stepDistance: 220, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "chiayi", name: "嘉義縣市", baseFare: 100, baseDistance: 1250, stepDistance: 220, stepFare: 5, slowStepSec: 80, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "tainan", name: "台南市", baseFare: 85, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 100, nightSurcharge: 0, nightPct: 20, ...COMMON },
  { key: "kaohsiung", name: "高雄市", baseFare: 85, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 100, nightSurcharge: 0, nightPct: 20, ...COMMON },
  { key: "pingtung", name: "屏東縣", baseFare: 100, baseDistance: 1250, stepDistance: 200, stepFare: 5, slowStepSec: 100, nightSurcharge: 0, nightPct: 20, ...COMMON },
  { key: "yilan", name: "宜蘭縣", baseFare: 120, baseDistance: 1500, stepDistance: 200, stepFare: 5, slowStepSec: 120, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "hualien", name: "花蓮縣", baseFare: 100, baseDistance: 1000, stepDistance: 230, stepFare: 5, slowStepSec: 120, nightSurcharge: 20, nightPct: 0, ...COMMON },
  { key: "taitung", name: "台東縣", baseFare: 100, baseDistance: 1000, stepDistance: 230, stepFare: 5, slowStepSec: 120, nightSurcharge: 20, nightPct: 0, ...COMMON },
];

export const DEFAULT_REGION_KEY = "taipei";

export function regionByKey(key: string): RegionRate {
  return REGIONS.find((r) => r.key === key) ?? REGIONS[0];
}

// 不含 key/name 的純費率（給可編輯的 active rate 使用）
export function rateOf(r: RegionRate): RateConfig {
  const { key: _k, name: _n, ...rate } = r;
  void _k;
  void _n;
  return rate;
}

export const TAIPEI_RATE: RateConfig = rateOf(REGIONS[0]);

export interface FareInputs {
  distanceM: number;
  slowSec: number;
  night: boolean;
  cny: boolean;
  highwayM: number;
}

export interface FareBreakdown {
  base: number;
  nightSurcharge: number;
  cnySurcharge: number;
  distanceFare: number;
  timeFare: number;
  toll: number;
  total: number;
}

/** 判斷某時刻是否落在夜間加成時段（跨午夜處理）。 */
export function isNightTime(d: Date, r: RateConfig): boolean {
  const h = d.getHours();
  if (r.nightStartHour > r.nightEndHour) {
    return h >= r.nightStartHour || h < r.nightEndHour;
  }
  return h >= r.nightStartHour && h < r.nightEndHour;
}

/** 估算過路費（元）。 */
export function estimateToll(highwayM: number, r: RateConfig): number {
  return Math.round((highwayM / 1000) * r.tollPerKm);
}

/**
 * 計算車資明細。續程（距離）與延滯（時間）共用同一個跳錶計數器、不雙重計算。
 * 夜間加成可為固定金額(nightSurcharge)或百分比(nightPct，對里程車資)。
 */
export function calcFare(input: FareInputs, r: RateConfig): FareBreakdown {
  const base = r.baseFare;
  const extraDistance = Math.max(0, input.distanceM - r.baseDistance);
  const distanceFare = Math.floor(extraDistance / r.stepDistance) * r.stepFare;
  const timeFare = Math.floor(input.slowSec / r.slowStepSec) * r.stepFare;
  const metered = base + distanceFare + timeFare;

  const nightSurcharge = input.night
    ? r.nightPct > 0
      ? Math.round((metered * r.nightPct) / 100)
      : r.nightSurcharge
    : 0;
  const cnySurcharge = input.cny ? r.cnySurcharge : 0;
  const toll = estimateToll(input.highwayM, r);

  const total = metered + nightSurcharge + cnySurcharge + toll;
  return { base, nightSurcharge, cnySurcharge, distanceFare, timeFare, toll, total };
}
