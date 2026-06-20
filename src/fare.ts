// 費率設定檔 + 純計費邏輯（無副作用，方便測試）。
// 北北基（台北市/新北市/基隆市）2023-04-01 起運價。
// 各縣市調漲時，只要改這個檔的數字即可。

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
  /** 夜間加成（元/趟） */
  nightSurcharge: number;
  /** 夜間時段起（含），24h */
  nightStartHour: number;
  /** 夜間時段迄（不含），24h */
  nightEndHour: number;
  /** 春節加成（元/趟），由使用者手動開啟 */
  cnySurcharge: number;
  /** 國道計程過路費估算（元/公里，小客車約 1.2） */
  tollPerKm: number;
}

export const TAIPEI_RATE: RateConfig = {
  baseFare: 85,
  baseDistance: 1250,
  stepDistance: 200,
  stepFare: 5,
  slowSpeedKmh: 5,
  slowStepSec: 60,
  nightSurcharge: 20,
  nightStartHour: 23,
  nightEndHour: 6,
  cnySurcharge: 30,
  tollPerKm: 1.2,
};

export interface FareInputs {
  /** 已行駛總里程（公尺） */
  distanceM: number;
  /** 累計低速延滯秒數 */
  slowSec: number;
  /** 是否套用夜間加成 */
  night: boolean;
  /** 是否套用春節加成 */
  cny: boolean;
  /** 高速公路里程（公尺），用來估過路費 */
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
    // 例如 23 → 6：跨午夜
    return h >= r.nightStartHour || h < r.nightEndHour;
  }
  return h >= r.nightStartHour && h < r.nightEndHour;
}

/** 估算過路費（元）。 */
export function estimateToll(highwayM: number, r: RateConfig): number {
  return Math.round((highwayM / 1000) * r.tollPerKm);
}

/**
 * 計算車資明細。
 * 續程（距離）與延滯（時間）共用同一個「stepFare 元/跳」計數器、不雙重計算：
 * 車速 ≥ slowSpeedKmh 時累積距離，否則累積延滯秒數（由呼叫端決定）。
 */
export function calcFare(input: FareInputs, r: RateConfig): FareBreakdown {
  const base = r.baseFare;
  const nightSurcharge = input.night ? r.nightSurcharge : 0;
  const cnySurcharge = input.cny ? r.cnySurcharge : 0;

  const extraDistance = Math.max(0, input.distanceM - r.baseDistance);
  const distanceFare = Math.floor(extraDistance / r.stepDistance) * r.stepFare;
  const timeFare = Math.floor(input.slowSec / r.slowStepSec) * r.stepFare;
  const toll = estimateToll(input.highwayM, r);

  const total = base + nightSurcharge + cnySurcharge + distanceFare + timeFare + toll;
  return { base, nightSurcharge, cnySurcharge, distanceFare, timeFare, toll, total };
}
