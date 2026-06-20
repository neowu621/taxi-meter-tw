// 趟次狀態 + 今日統計（localStorage 持久化）+ 費率覆寫。
import { RateConfig, TAIPEI_RATE } from "./fare.ts";

export type MeterMode = "idle" | "running" | "stopped";

/** 高速公路套用模式：null=自動偵測、true=手動開、false=手動關 */
export type HighwayOverride = null | boolean;

export interface TripState {
  mode: MeterMode;
  /** 已行駛總里程（公尺） */
  distanceM: number;
  /** 高速里程（公尺） */
  highwayM: number;
  /** 累計低速延滯秒數 */
  slowSec: number;
  /** 本趟經過秒數 */
  elapsedSec: number;
  /** 上車時間 */
  boardAt: number | null;
  /** 夜間加成是否套用（依上車時間鎖定） */
  night: boolean;
  /** 春節加成 */
  cny: boolean;
  highwayOverride: HighwayOverride;
  /** 自動偵測結果 */
  highwayAuto: boolean;
}

export function newTrip(): TripState {
  return {
    mode: "idle",
    distanceM: 0,
    highwayM: 0,
    slowSec: 0,
    elapsedSec: 0,
    boardAt: null,
    night: false,
    cny: false,
    highwayOverride: null,
    highwayAuto: false,
  };
}

export function highwayActive(s: TripState): boolean {
  return s.highwayOverride === null ? s.highwayAuto : s.highwayOverride;
}

// ---- 今日統計 ----
const STATS_KEY = "taxi-meter:dailyStats";

export interface DailyStats {
  date: string; // YYYY-MM-DD
  trips: number;
  revenue: number;
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function loadStats(): DailyStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as DailyStats;
      if (s.date === todayKey()) return s;
    }
  } catch {
    /* ignore */
  }
  return { date: todayKey(), trips: 0, revenue: 0 };
}

export function recordTrip(fare: number): DailyStats {
  const s = loadStats();
  s.trips += 1;
  s.revenue += fare;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  return s;
}

export function resetStats(): DailyStats {
  const s: DailyStats = { date: todayKey(), trips: 0, revenue: 0 };
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
  return s;
}

// ---- 費率覆寫（可由設定畫面調整，預設用北北基） ----
const RATE_KEY = "taxi-meter:rate";

export function loadRate(): RateConfig {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) return { ...TAIPEI_RATE, ...(JSON.parse(raw) as Partial<RateConfig>) };
  } catch {
    /* ignore */
  }
  return { ...TAIPEI_RATE };
}

export function saveRate(r: RateConfig): void {
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}
