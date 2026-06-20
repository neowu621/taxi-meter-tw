// GPS 里程量測 + 車速估算 + 螢幕常亮（Wake Lock）。
// 手機只能靠 GPS 估距離，先天會有誤差；這裡做基本濾波，並在訊號差時退回時間計費。

export interface GeoSample {
  /** 與上一點的距離增量（公尺），已濾波 */
  distanceDelta: number;
  /** 估算車速（km/h） */
  speedKmh: number;
  /** 定位精度（公尺），越小越好 */
  accuracy: number;
  /** 訊號品質：good / weak / lost */
  quality: "good" | "weak" | "lost";
}

const R_EARTH = 6371000; // 公尺

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoTrackerOptions {
  /** 精度超過此值（公尺）視為訊號差，不採計距離 */
  accuracyGate?: number;
  /** 推算車速超過此值（km/h）視為 GPS 跳點，丟棄 */
  maxSpeedKmh?: number;
}

export class GeoTracker {
  private watchId: number | null = null;
  private lastLat = 0;
  private lastLon = 0;
  private lastTime = 0;
  private hasFix = false;
  private accuracyGate: number;
  private maxSpeedKmh: number;

  constructor(
    private onSample: (s: GeoSample) => void,
    opts: GeoTrackerOptions = {},
  ) {
    this.accuracyGate = opts.accuracyGate ?? 35;
    this.maxSpeedKmh = opts.maxSpeedKmh ?? 180;
  }

  static get supported(): boolean {
    return "geolocation" in navigator;
  }

  start(): void {
    if (this.watchId !== null || !GeoTracker.supported) return;
    this.hasFix = false;
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handle(pos),
      () => this.onSample({ distanceDelta: 0, speedKmh: 0, accuracy: 9999, quality: "lost" }),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 },
    );
  }

  stop(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private handle(pos: GeolocationPosition): void {
    const { latitude, longitude, accuracy, speed } = pos.coords;
    const now = pos.timestamp;

    if (!this.hasFix) {
      this.lastLat = latitude;
      this.lastLon = longitude;
      this.lastTime = now;
      this.hasFix = true;
      this.onSample({ distanceDelta: 0, speedKmh: 0, accuracy, quality: this.qualityOf(accuracy) });
      return;
    }

    const dt = (now - this.lastTime) / 1000;
    let delta = haversine(this.lastLat, this.lastLon, latitude, longitude);

    // 由位移推算車速，優先採用裝置回報的 speed（公尺/秒）。
    let speedKmh = speed != null && speed >= 0 ? speed * 3.6 : dt > 0 ? (delta / dt) * 3.6 : 0;

    const quality = this.qualityOf(accuracy);

    // 濾波：精度太差、或推算速度離譜（跳點）、或位移小於精度（雜訊）→ 不採計距離。
    if (accuracy > this.accuracyGate || speedKmh > this.maxSpeedKmh || delta < accuracy * 0.5) {
      delta = 0;
    }

    this.lastLat = latitude;
    this.lastLon = longitude;
    this.lastTime = now;

    if (speedKmh > this.maxSpeedKmh) speedKmh = 0;
    this.onSample({ distanceDelta: delta, speedKmh, accuracy, quality });
  }

  private qualityOf(accuracy: number): GeoSample["quality"] {
    if (accuracy <= this.accuracyGate) return "good";
    if (accuracy <= this.accuracyGate * 3) return "weak";
    return "lost";
  }
}

// ---- Wake Lock：行車中螢幕常亮 ----
let wakeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => {
        wakeLock = null;
      });
    }
  } catch {
    // 使用者拒絕或不支援，忽略
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

/** 切回前景時重新取得 Wake Lock（系統會在切到背景時自動釋放）。 */
export function reacquireWakeLockOnVisible(active: () => boolean): void {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && active() && !wakeLock) {
      void requestWakeLock();
    }
  });
}
