// 高速公路自動偵測（速度啟發式）。
// 持續高速一段時間 → 判定上高速並自動亮燈；降速一段時間 → 自動熄燈。
// 不靜默改變金額，只切換過路費累計；使用者可隨時手動覆寫。

export interface HighwayDetectorOptions {
  /** 進入高速門檻（km/h） */
  onSpeed?: number;
  /** 離開高速門檻（km/h） */
  offSpeed?: number;
  /** 連續達標幾秒才切換 ON */
  holdOnSec?: number;
  /** 連續低於門檻幾秒才切換 OFF */
  holdOffSec?: number;
}

export class HighwayDetector {
  private onSpeed: number;
  private offSpeed: number;
  private holdOn: number;
  private holdOff: number;
  private highHold = 0;
  private lowHold = 0;
  private auto = false;

  constructor(opts: HighwayDetectorOptions = {}) {
    this.onSpeed = opts.onSpeed ?? 80;
    this.offSpeed = opts.offSpeed ?? 60;
    this.holdOn = opts.holdOnSec ?? 3;
    this.holdOff = opts.holdOffSec ?? 5;
  }

  /** 每秒餵入目前車速，回傳目前自動判定結果。 */
  update(speedKmh: number): boolean {
    if (speedKmh >= this.onSpeed) {
      this.highHold += 1;
      this.lowHold = 0;
      if (this.highHold >= this.holdOn) this.auto = true;
    } else if (speedKmh < this.offSpeed) {
      this.lowHold += 1;
      this.highHold = 0;
      if (this.lowHold >= this.holdOff) this.auto = false;
    } else {
      this.highHold = 0;
      this.lowHold = 0;
    }
    return this.auto;
  }

  get value(): boolean {
    return this.auto;
  }

  reset(): void {
    this.highHold = 0;
    this.lowHold = 0;
    this.auto = false;
  }
}
