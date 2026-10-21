// ==========================================
// 賽道圓球排位 (Ball Layout)
// 整場一次過按幀序計好每粒波的顯示位置，再做時間平滑；渲染時只係查表。
// 同一幀點樣重畫 (揀馬、轉 size、轉鏡頭、拉 bar、重播) 都係同一個位置。
// ==========================================

import type { HorseSimulationState } from '../types/race';
import type { RacePath } from './courseGeometry';

export type BallPositions = Map<string, { x: number; y: number; angle: number }>;

// 用戶 2026-10-21 定案: 前後 58 / 橫向 30 (波直徑 20)
const AXIS_ALONG = 58;
const AXIS_ACROSS = 30;
const LANE_BAND = 38; // 波中心橫向最多離中線 38 (跑道帶 70 + 少少出界)
const PULL = 0.04; // 每次迭代拉返真位置嘅比例
const SOLVE_ITERS = 40;
const SETTLE_ITERS = 60;
const SMOOTH_RADIUS = 3; // 前後各 3 幀三角窗

const laneOffset = (h: HorseSimulationState) => 23 - h.lane * 11; // 跑道擴闊後疊位橫移同步攤開

export function trueBallPoint(path: RacePath, h: HorseSimulationState) {
  const pos = path.pointAtRace(h.currentDistance);
  const n = laneOffset(h);
  return { x: pos.x + Math.sin(pos.angle) * n, y: pos.y - Math.cos(pos.angle) * n, angle: pos.angle };
}

// 終點壓縮: 最後 15% 途程起間距逐步收細 (至 45%)，成場馬壓喺終點前少少空間都排得落。
function spacingFactor(horses: HorseSimulationState[], totalDist: number) {
  const leadDist = Math.max(...horses.map((h) => h.currentDistance));
  if (leadDist >= totalDist) return 0.45;
  if (leadDist > totalDist * 0.85) return 1 - 0.55 * ((leadDist - totalDist * 0.85) / (totalDist * 0.15));
  return 1;
}

function pxPerMetre(path: RacePath) {
  const span = Math.min(40, path.distance);
  const a = path.pointAtRace(path.distance - span);
  const b = path.pointAtRace(path.distance);
  return Math.hypot(b.x - a.x, b.y - a.y) / span || 1;
}

// 沿跑道座標: s = 沿跑向 (px)，n = 橫向偏移 (px, 正數向左)。s < 0 (起點後面) 沿起點方向直線延伸。
function trackPoint(path: RacePath, k: number, s: number, n: number) {
  let p;
  if (s >= 0) {
    p = path.pointAtRace(s / k);
  } else {
    const p0 = path.pointAtRace(0);
    p = { x: p0.x + Math.cos(p0.angle) * s, y: p0.y + Math.sin(p0.angle) * s, angle: p0.angle };
  }
  return { x: p.x + Math.sin(p.angle) * n, y: p.y - Math.cos(p.angle) * n, angle: p.angle };
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// 彎位曲率 dθ/ds: 橫向偏移 n 嗰條線上，沿跑向實際距離 = ds × (1 + n·κ)。
// 唔計嘅話內欄嘅波喺彎位會貼埋 (直路 58 去到彎位得返 40 左右)。
function curvature(path: RacePath, k: number, s: number) {
  if (s <= 3) return 0;
  const a = path.pointAtRace((s - 3) / k).angle;
  const b = path.pointAtRace((s + 3) / k).angle;
  return wrapAngle(b - a) / 6;
}

interface Slot {
  ds: number; // 沿跑向讓位 (顯示 − 真位置)
  n: number; // 顯示橫向偏移
}

/**
 * 單幀排位 (沿跑道座標):
 * 由上一幀結果起步，每次迭代輕輕拉返真位置，再逐對執行橢圓間距;
 * 按賽事次序 (已跑距離，同距離按名次)，後面嗰粒只會向後或者向側讓，唔會顯示喺前面嗰粒之前。
 */
function solveFrame(
  path: RacePath,
  k: number,
  horses: HorseSimulationState[],
  totalDist: number,
  prev: Map<string, Slot> | null
): Map<string, Slot> {
  const ff = spacingFactor(horses, totalDist);
  const A = AXIS_ALONG * ff;
  const C = AXIS_ACROSS * ff;
  const N = horses.length;
  const sFinish = totalDist * k;
  const pts = [...horses]
    .sort((a, b) => b.currentDistance - a.currentDistance || a.rank - b.rank)
    .map((h) => {
      const s0 = h.currentDistance * k;
      const n0 = laneOffset(h);
      const p = prev?.get(h.horseId);
      return {
        id: h.horseId,
        s0,
        n0,
        s: s0 + (p?.ds ?? 0),
        n: p?.n ?? n0,
        kappa: 0,
        im: 1 / (1 + (N - h.rank) * 0.35), // 領先馬最重，盡量唔郁
      };
    });
  const project = () => {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i];
        const b = pts[j];
        const ds = a.s - b.s;
        const dn = a.n - b.n;
        const sc = Math.max(0.3, 1 + ((a.n + b.n) / 2) * ((a.kappa + b.kappa) / 2));
        const u = (Math.max(ds, 0) * sc) / A;
        const v = dn / C;
        const e = Math.hypot(u, v);
        if (e >= 1) continue;
        const du = e < 1e-6 ? 1 : u / e;
        const dv = e < 1e-6 ? 0 : v / e;
        const cs = ((du - (ds * sc) / A) * A) / sc;
        const cn = (dv - v) * C;
        const tot = a.im + b.im;
        a.s += cs * (a.im / tot);
        a.n += cn * (a.im / tot);
        b.s -= cs * (b.im / tot);
        b.n -= cn * (b.im / tot);
      }
    }
    for (const p of pts) {
      p.n = Math.max(-LANE_BAND, Math.min(LANE_BAND, p.n));
      p.s = Math.min(p.s, sFinish); // 唔推過終點 (終點後走線會夾死喺終點，波會疊埋)
    }
  };
  for (let iter = 0; iter < SOLVE_ITERS; iter++) {
    for (const p of pts) {
      p.s += (p.s0 - p.s) * PULL;
      p.n += (p.n0 - p.n) * PULL;
      if (iter % 10 === 0) p.kappa = curvature(path, k, p.s);
    }
    project();
  }
  for (const p of pts) p.kappa = curvature(path, k, p.s);
  for (let iter = 0; iter < SETTLE_ITERS; iter++) project();
  return new Map(pts.map((p) => [p.id, { ds: p.s - p.s0, n: p.n }]));
}

/**
 * 整場波位: 由第 0 幀起按序承接解一次 (結果只取決於幀序，唔取決於渲染歷史)，
 * 再將讓位量 ds 同橫向 n 做前後對稱三角窗平滑，名次交換 / 重排變成幾幀內滑過去。
 */
export function computeBallTrack(
  path: RacePath,
  frames: { horses: HorseSimulationState[] }[],
  totalDist: number
): BallPositions[] {
  const k = pxPerMetre(path);
  const sol: Map<string, Slot>[] = [];
  let prev: Map<string, Slot> | null = null;
  for (const f of frames) {
    prev = solveFrame(path, k, f.horses, totalDist, prev);
    sol.push(prev);
  }
  return frames.map((f, i) => {
    const out: BallPositions = new Map();
    for (const h of f.horses) {
      let sds = 0;
      let sn = 0;
      let wsum = 0;
      for (let j = Math.max(0, i - SMOOTH_RADIUS); j <= Math.min(frames.length - 1, i + SMOOTH_RADIUS); j++) {
        const v = sol[j].get(h.horseId);
        if (!v) continue;
        const w = SMOOTH_RADIUS + 1 - Math.abs(j - i);
        sds += v.ds * w;
        sn += v.n * w;
        wsum += w;
      }
      out.set(h.horseId, trackPoint(path, k, h.currentDistance * k + sds / wsum, sn / wsum));
    }
    return out;
  });
}

/** 橢圓間距指標: 1.0 = 全部波對都達到目標間距 (用各自顯示位置嘅跑向量度) */
export function ballSpacingIndex(horses: HorseSimulationState[], totalDist: number, pos: BallPositions): number {
  const ff = spacingFactor(horses, totalDist);
  const pts = horses.map((h) => pos.get(h.horseId)!);
  let minE = Infinity;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i];
      const b = pts[j];
      let tx = Math.cos(a.angle) + Math.cos(b.angle);
      let ty = Math.sin(a.angle) + Math.sin(b.angle);
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dt = dx * tx + dy * ty;
      const dn = -dx * ty + dy * tx;
      minE = Math.min(minE, Math.hypot(dt / (AXIS_ALONG * ff), dn / (AXIS_ACROSS * ff)));
    }
  }
  return minE;
}
