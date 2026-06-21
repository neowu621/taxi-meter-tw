import "./styles.css";
import { APP_VERSION } from "./version.ts";
import { calcFare, isNightTime, TAIPEI_RATE, type RateConfig } from "./fare.ts";
import {
  GeoTracker,
  requestWakeLock,
  releaseWakeLock,
  reacquireWakeLockOnVisible,
  type GeoSample,
} from "./geo.ts";
import { HighwayDetector } from "./highway.ts";
import {
  newTrip,
  highwayActive,
  loadStats,
  loadRate,
  saveRate,
  recordTrip,
  resetStats,
  type TripState,
} from "./state.ts";

const rate = loadRate();
let st: TripState = newTrip();
let stats = loadStats();
let sourceMode: "gps" | "sim" = "gps";
let currentSpeedKmh = 0;
let nightForce = false;
let cny = false;
let timer: number | null = null;
let gpsActive = false;

const detector = new HighwayDetector();
const tracker = new GeoTracker((s) => {
  currentSpeedKmh = s.speedKmh;
  updateGps(s);
  if (st.mode === "running" && s.speedKmh >= rate.slowSpeedKmh) {
    st.distanceM += s.distanceDelta;
    if (highwayActive(st)) st.highwayM += s.distanceDelta;
  }
});

// ---- DOM helpers ----
const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const all = (cls: string) => Array.from(document.querySelectorAll<HTMLElement>("." + cls));
const setText = (cls: string, t: string | number) => all(cls).forEach((e) => (e.textContent = String(t)));
const pad = (n: number) => (n < 10 ? "0" : "") + n;
const clock = (s: number) =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))}`;

function effectiveNight(): boolean {
  return nightForce || st.night;
}

function fare() {
  return calcFare(
    { distanceM: st.distanceM, slowSec: st.slowSec, night: effectiveNight(), cny, highwayM: st.highwayM },
    rate,
  );
}

// 訊號格：依精度(公尺)決定亮幾格，並顯示精度數字；未定位時顯示「定位中…」。
function updateGps(s: GeoSample) {
  let level = 0;
  if (s.accuracy <= 15) level = 3;
  else if (s.accuracy <= 35) level = 2;
  else if (s.accuracy <= 80) level = 1;
  const searching = s.accuracy >= 999;
  const txt = searching ? "定位中…" : `${Math.round(s.accuracy)}m`;
  all("v-gps").forEach((e) => {
    e.classList.remove("good", "weak", "lost", "searching");
    e.classList.add(searching ? "searching" : s.quality);
    e.querySelectorAll(".bars i").forEach((b, i) => b.classList.toggle("lit", i < level));
    const t = e.querySelector(".v-gpstxt");
    if (t) t.textContent = txt;
  });
  // GPS 即時車速顯示在訊號旁（透過 GPS 取得）
  setText("v-speed", Math.round(s.speedKmh));
}

function setGpsLabel(text: string) {
  all("v-gps").forEach((e) => {
    e.classList.remove("good", "weak", "lost", "searching");
    e.querySelectorAll(".bars i").forEach((b) => b.classList.remove("lit"));
    const t = e.querySelector(".v-gpstxt");
    if (t) t.textContent = text;
  });
}

function render() {
  const f = fare();
  setText("v-time", clock(st.elapsedSec));
  setText("v-fare", f.total);
  setText("v-dist", (st.distanceM / 1000).toFixed(2));
  setText("v-toll", f.toll);
  setText("v-avg", st.elapsedSec > 0 ? Math.round(st.distanceM / 1000 / (st.elapsedSec / 3600)) : 0);
  setText("v-speed", Math.round(currentSpeedKmh));
  setText("v-board", st.boardAt ? `${pad(new Date(st.boardAt).getHours())}:${pad(new Date(st.boardAt).getMinutes())}` : "--:--");
  setText("v-trips", stats.trips);
  setText("v-rev", stats.revenue.toLocaleString("en-US"));
  setText("v-status", st.mode === "idle" ? "空車待命" : st.mode === "running" ? "計費中" : "停車結帳");
  setText("v-hwmode", st.highwayOverride === null ? "自動" : st.highwayOverride ? "手動開" : "手動關");

  const running = st.mode === "running";
  document.body.classList.toggle("metering", running);
  all("act-start").forEach((b) => b.classList.toggle("is-running", running));

  const hw = highwayActive(st);
  all("act-hw").forEach((b) => b.classList.toggle("is-on", hw));
  all("lamp-hw").forEach((l) => {
    l.classList.toggle("on-hw", hw);
    l.textContent = hw ? "高速公路" : "一般道路";
  });
  const night = effectiveNight();
  all("lamp-period").forEach((l) => {
    l.classList.toggle("on-night", night);
    l.textContent = night ? "夜間+20" : "日間";
  });
}

// ---- meter loop ----
function tick() {
  if (st.mode !== "running") return;
  st.elapsedSec += 1;

  if (sourceMode === "sim") {
    currentSpeedKmh = Number((document.getElementById("sim-speed") as HTMLInputElement).value);
    if (currentSpeedKmh >= rate.slowSpeedKmh) {
      const dm = (currentSpeedKmh * 1000) / 3600;
      st.distanceM += dm;
      if (highwayActive(st)) st.highwayM += dm;
    }
  }

  if (currentSpeedKmh < rate.slowSpeedKmh) st.slowSec += 1;
  st.highwayAuto = detector.update(currentSpeedKmh);
  render();
}

function startLoop() {
  if (timer === null) timer = window.setInterval(tick, 1000);
}
function stopLoop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

// GPS 模式下持續定位，讓訊號與車速即時顯示（距離只在計費中才累計）
function ensureGps() {
  if (gpsActive || sourceMode !== "gps" || !GeoTracker.supported) return;
  tracker.start();
  gpsActive = true;
  updateGps({ distanceDelta: 0, speedKmh: 0, accuracy: 9999, quality: "lost" });
}
function stopGps() {
  tracker.stop();
  gpsActive = false;
}

// ---- actions ----
function onStart() {
  if (st.mode === "running") return;
  if (st.mode === "idle") {
    st.boardAt = Date.now();
    st.night = isNightTime(new Date(st.boardAt), rate);
  }
  st.mode = "running";
  ($(".receipt") as HTMLElement).hidden = true;
  ensureGps();
  void requestWakeLock();
  startLoop();
  render();
}

function onStop() {
  if (st.mode !== "running") return;
  st.mode = "stopped";
  stopLoop();
  void releaseWakeLock();
  render();
}

function onClear() {
  // 結算本趟（有上車且有產生車資才計入今日統計）
  if (st.boardAt && fare().total > rate.baseFare) {
    stats = recordTrip(fare().total);
  }
  stopLoop();
  void releaseWakeLock();
  st = newTrip();
  detector.reset();
  currentSpeedKmh = 0;
  ($(".receipt") as HTMLElement).hidden = true;
  render();
}

function onHighway() {
  st.highwayOverride =
    st.highwayOverride === null ? true : st.highwayOverride === true ? false : null;
  render();
}

function onPrint() {
  const f = fare();
  const r = $(".receipt") as HTMLElement;
  const row = (k: string, v: string) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  r.innerHTML =
    `<h3>行程收據（估價）</h3><table>` +
    row("上車時間", st.boardAt ? new Date(st.boardAt).toLocaleString("zh-TW") : "-") +
    row("計時", clock(st.elapsedSec)) +
    row("總里程", (st.distanceM / 1000).toFixed(2) + " km") +
    row("其中高速里程", (st.highwayM / 1000).toFixed(2) + " km") +
    row(`起跳${effectiveNight() ? "（夜間 105）" : "（85）"}`, f.base + f.nightSurcharge + " 元") +
    (f.cnySurcharge ? row("春節加成", f.cnySurcharge + " 元") : "") +
    row("續程里程", f.distanceFare + " 元") +
    row("延滯計時", f.timeFare + " 元") +
    row("過路費（約 1.2/km）", f.toll + " 元") +
    `</table><div class="total"><span>合計</span><span>${f.total} 元</span></div>` +
    `<div class="note">※ 自用估價參考，非合格跳表收費依據</div>`;
  r.hidden = false;
}

// ---- wiring ----
function bind(cls: string, fn: () => void) {
  all(cls).forEach((b) => b.addEventListener("click", fn));
}
bind("act-start", onStart);
bind("act-stop", onStop);
bind("act-clear", onClear);
bind("act-hw", onHighway);
bind("act-print", onPrint);

document.querySelectorAll<HTMLButtonElement>(".layout-toggle button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const view = btn.dataset.layout!;
    document.querySelectorAll<HTMLButtonElement>(".layout-toggle button").forEach((b) =>
      b.classList.toggle("on", b === btn),
    );
    document.querySelectorAll<HTMLElement>("[data-view]").forEach((sec) => {
      (sec as HTMLElement).hidden = sec.dataset.view !== view;
    });
  });
});

const srcSel = document.getElementById("src-mode") as HTMLSelectElement;
srcSel.addEventListener("change", () => {
  sourceMode = srcSel.value as "gps" | "sim";
  document.getElementById("app")!.classList.toggle("sim", sourceMode === "sim");
  if (sourceMode === "sim") {
    stopGps();
    setText("v-speed", 0);
    setGpsLabel("模擬");
  } else {
    ensureGps();
  }
});

const simSpeed = document.getElementById("sim-speed") as HTMLInputElement;
const simOut = document.getElementById("sim-out") as HTMLElement;
simSpeed.addEventListener("input", () => (simOut.textContent = simSpeed.value));
document.querySelectorAll<HTMLButtonElement>(".presets button").forEach((b) =>
  b.addEventListener("click", () => {
    simSpeed.value = b.dataset.sim!;
    simOut.textContent = b.dataset.sim!;
  }),
);

(document.getElementById("cny") as HTMLInputElement).addEventListener("change", (e) => {
  cny = (e.target as HTMLInputElement).checked;
  render();
});
(document.getElementById("night-force") as HTMLInputElement).addEventListener("change", (e) => {
  nightForce = (e.target as HTMLInputElement).checked;
  render();
});
document.getElementById("reset-stats")!.addEventListener("click", () => {
  stats = resetStats();
  render();
});

// ---- 費率設定表單 ----
const RATE_FIELDS: (keyof RateConfig)[] = [
  "baseFare",
  "baseDistance",
  "stepDistance",
  "stepFare",
  "slowStepSec",
  "nightSurcharge",
  "cnySurcharge",
  "tollPerKm",
];
function fillRateForm() {
  RATE_FIELDS.forEach((k) => {
    const el = document.getElementById("r-" + k) as HTMLInputElement | null;
    if (el) el.value = String(rate[k]);
  });
}
RATE_FIELDS.forEach((k) => {
  const el = document.getElementById("r-" + k) as HTMLInputElement | null;
  el?.addEventListener("input", () => {
    const v = parseFloat(el.value);
    if (!Number.isNaN(v) && v >= 0) {
      rate[k] = v;
      saveRate(rate);
      render();
    }
  });
});
document.getElementById("reset-rate")!.addEventListener("click", () => {
  Object.assign(rate, TAIPEI_RATE);
  saveRate(rate);
  fillRateForm();
  render();
});
fillRateForm();

// ---- 全螢幕營業模式 ----
const iosHint = document.getElementById("ios-hint") as HTMLElement;
let iosHintTimer: number | null = null;
function isIos(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}
function isStandalone(): boolean {
  return (
    (navigator as unknown as { standalone?: boolean }).standalone === true ||
    matchMedia("(display-mode: standalone)").matches
  );
}
function hideIosHint() {
  iosHint.hidden = true;
  if (iosHintTimer) {
    clearTimeout(iosHintTimer);
    iosHintTimer = null;
  }
}
function maybeShowIosHint() {
  // iPhone/iPad 用 Safari（非主畫面模式）才提示「加到主畫面」可獲得真正全螢幕
  if (!isIos() || isStandalone()) return;
  if (localStorage.getItem("taxi-meter:iosHintDismissed")) return;
  iosHint.hidden = false;
  if (iosHintTimer) clearTimeout(iosHintTimer);
  iosHintTimer = window.setTimeout(() => (iosHint.hidden = true), 8000);
}
function enterOperating() {
  document.body.classList.add("op-active");
  ensureGps();
  const p = document.documentElement.requestFullscreen?.();
  if (p) {
    p.then(() => (screen.orientation as unknown as { lock?: (o: string) => Promise<void> })?.lock?.("landscape")?.catch?.(() => {})).catch(() => {});
  }
  maybeShowIosHint();
}
function exitOperating() {
  document.body.classList.remove("op-active");
  hideIosHint();
  (screen.orientation as unknown as { unlock?: () => void })?.unlock?.();
  if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => {});
}
document.getElementById("enter-op")!.addEventListener("click", enterOperating);
document.getElementById("exit-op")!.addEventListener("click", exitOperating);
document.getElementById("ios-hint-close")!.addEventListener("click", () => {
  localStorage.setItem("taxi-meter:iosHintDismissed", "1");
  hideIosHint();
});
// 全螢幕時點一下收據即可關閉
($(".receipt") as HTMLElement).addEventListener("click", () => {
  if (document.body.classList.contains("op-active")) ($(".receipt") as HTMLElement).hidden = true;
});
// 由瀏覽器手勢離開全螢幕時，同步退出營業模式
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement) document.body.classList.remove("op-active");
});

reacquireWakeLockOnVisible(() => st.mode === "running");

setInterval(() => {
  const d = new Date();
  setText("v-clock", `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`);
}, 1000);

setText("ver", "v" + APP_VERSION);
if (!GeoTracker.supported) {
  // 沒有定位能力時，預設切到模擬模式方便測試
  srcSel.value = "sim";
  srcSel.dispatchEvent(new Event("change"));
}
render();
