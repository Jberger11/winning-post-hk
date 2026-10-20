// ==========================================
// 賽道全景渲染器 (Course View Renderer)
// 沿真實馬場形狀繪畫: 環形賽道 (直路 + 兩個彎位)、欄杆、內場、
// 看台、起點閘、終點柱、剩餘途程標示、彎位標籤，
// 馬匹按 replay 幀的已跑距離沿賽道推進，疊位 (lane) 轉成橫向偏移。
// ==========================================

import type { HorseSimulationState } from '../types/race';
import {
  COURSE_VIRTUAL_HEIGHT,
  COURSE_VIRTUAL_WIDTH,
  courseCenter,
  courseShape,
  type RacePath,
} from './courseGeometry';

export interface CourseViewOptions {
  width: number;
  height: number;
  path: RacePath;
  horses: HorseSimulationState[];
  totalDist: number;
  isDirt: boolean;
  isNight: boolean;
  venueNameZh: string;
  playerHorseIds: Set<string>;
  selectedHorseId: string | null;
  focusPoint?: { x: number; y: number } | null; // 愛駒追蹤: 虛擬座標焦點
  fm?: boolean; // FM 風格: 淨色草地、無雜物、淨色圓點、資訊優先
  onLayout?: (minPairwise: number) => void; // 測試用: 回報避疊後最細波距
  onPositions?: (pos: Map<string, { x: number; y: number }>) => void; // 測試用: 回報顯示位置
}

// 避疊版面連續性：上一格的顯示位置 (key: 場地+途程+馬匹集合)。逐格承接而非由零
// 重計，波的走位才會順，唔會今格左、下格右咁跳 (用戶 2026-10-21 投訴)。
let layoutCache: { key: string; lead: number; pos: Map<string, { x: number; y: number }> } | null = null;

export function __resetCourseLayoutCache() {
  layoutCache = null;
}

const pseudoRand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function sampleLoop(path: RacePath, step: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const total = path.totalLoopLength;
  for (let s = 0; s <= total; s += step) {
    const p = path.pointAtLoop(s);
    pts.push({ x: p.x, y: p.y });
  }
  return pts;
}

function strokePoints(
  ctx: CanvasRenderingContext2D,
  pts: { x: number; y: number }[],
  close = true
) {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
  ctx.stroke();
}

export function drawCourseView(ctx: CanvasRenderingContext2D, opts: CourseViewOptions) {
  const { width, height, path, horses, totalDist, isDirt, isNight, playerHorseIds, selectedHorseId } = opts;
  const shape = courseShape(path.venue);
  const center = courseCenter(path.venue);
  const band = 70; // 賽道闊度 (虛擬單位) — 用戶要求擴闊，等馬群拉長排都留喺跑道上

  // ---------- 背景 ----------
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  if (isNight) {
    bg.addColorStop(0, '#020617');
    bg.addColorStop(1, '#0b1220');
  } else {
    bg.addColorStop(0, '#0c1a2e');
    bg.addColorStop(1, '#122036');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // ---------- 相機變換 ----------
  ctx.save();
  const baseScale = Math.min(width / COURSE_VIRTUAL_WIDTH, height / COURSE_VIRTUAL_HEIGHT);
  if (opts.focusPoint) {
    const zoom = baseScale * 2.15;
    ctx.translate(width / 2, height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-opts.focusPoint.x, -opts.focusPoint.y);
  } else {
    ctx.translate((width - COURSE_VIRTUAL_WIDTH * baseScale) / 2, (height - COURSE_VIRTUAL_HEIGHT * baseScale) / 2);
    ctx.scale(baseScale, baseScale);
  }

  const loopPts = sampleLoop(path, 7);

  // ---------- 內場 ----------
  const infieldPts = loopPts.map(p => ({
    x: center.x + (p.x - center.x) * 0.845,
    y: center.y + (p.y - center.y) * 0.845,
  }));
  ctx.fillStyle = isDirt ? '#123524' : opts.fm ? '#14532d' : '#0a3d22';
  ctx.beginPath();
  infieldPts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();

  // FM 風格: 內場中央標誌 (球場中圈咁，低調標示場地+途程)
  if (opts.fm) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(center.x, center.y, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.20)';
    ctx.font = 'black 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${totalDist}M`, center.x, center.y + 2);
    ctx.font = '700 15px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillText(opts.venueNameZh, center.x, center.y + 26);
  }

  // 彭福公園樹影 (種子固定) — FM 模式跳過，保持畫面乾淨
  for (let i = 0; i < (opts.fm ? 0 : 90); i++) {
    const tx = center.x + (pseudoRand(i * 3 + 1) - 0.5) * (shape.cx2 - shape.cx1) * 0.92;
    const ty = center.y + (pseudoRand(i * 7 + 2) - 0.5) * shape.r * 1.25;
    const tr = 5 + pseudoRand(i * 13 + 4) * 9;
    ctx.fillStyle = `rgba(20, 83, 45, ${0.5 + pseudoRand(i * 17) * 0.4})`;
    ctx.beginPath();
    ctx.arc(tx, ty, tr, 0, Math.PI * 2);
    ctx.fill();
  }
  // 沙田內場湖 (FM 模式跳過)
  if (path.venue === 'shatin' && !opts.fm) {
    ctx.fillStyle = 'rgba(56, 130, 180, 0.55)';
    ctx.beginPath();
    ctx.ellipse(center.x - 60, center.y + 6, 74, 26, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // ---------- 賽道本體 ----------
  // 外圍混凝土邊
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
  ctx.lineWidth = band + 18;
  ctx.lineJoin = 'round';
  strokePoints(ctx, loopPts);
  // 白色欄杆底 (比草面闊，露出兩邊白邊)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = band + 7;
  strokePoints(ctx, loopPts);
  // 草面/泥地主體: 分段交替深淺 (剪草紋理跟著賽道彎)
  const segLen = 64;
  const total = path.totalLoopLength;
  for (let s = 0; s < total; s += segLen) {
    const chunk: { x: number; y: number }[] = [];
    for (let d = 0; d <= segLen + 7; d += 7) {
      const p = path.pointAtLoop(Math.min(s + d, total));
      chunk.push({ x: p.x, y: p.y });
    }
    const idx = Math.floor(s / segLen);
    ctx.strokeStyle = isDirt
      ? idx % 2 === 0
        ? '#6b4423'
        : '#7d5228'
      : opts.fm
        ? idx % 2 === 0
          ? '#22a355'
          : '#1d9150'
        : idx % 2 === 0
          ? '#177245'
          : '#125c36';
    ctx.lineWidth = band;
    ctx.lineCap = 'round';
    strokePoints(ctx, chunk, false);
  }
  // 內欄線
  const innerPts = loopPts.map(p => ({
    x: center.x + (p.x - center.x) * 0.955,
    y: center.y + (p.y - center.y) * 0.955,
  }));
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.4;
  strokePoints(ctx, innerPts);

  // 直路賽 chute (沙田1000米): 在主圈上加粗顯示直路部分
  if (path.isStraightCourse) {
    const chutePts: { x: number; y: number }[] = [];
    for (let d = 0; d <= path.distance; d += 25) {
      const p = path.pointAtRace(d);
      chutePts.push({ x: p.x, y: p.y });
    }
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.lineWidth = band * 0.92;
    ctx.lineCap = 'round';
    strokePoints(ctx, chutePts, false);
  }

  // ---------- 主看台 (主直路外側) ----------
  const standY = shape.cy + shape.r + 52;
  const standX1 = shape.cx1 + 30;
  const standX2 = shape.cx2 + 40;
  ctx.fillStyle = isNight ? '#1e293b' : '#27354d';
  ctx.beginPath();
  ctx.roundRect(standX1, standY, standX2 - standX1, 56, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
  ctx.fillRect(standX1, standY, standX2 - standX1, 5);
  for (let r = 0; r < (opts.fm ? 0 : 3); r++) {
    for (let d = 0; d < 60; d++) {
      const seed = r * 131 + d * 7;
      if (pseudoRand(seed) > 0.42) {
        ctx.fillStyle = `rgba(${190 + Math.floor(pseudoRand(seed + 1) * 50)}, ${180 + Math.floor(pseudoRand(seed + 2) * 40)}, 205, 0.55)`;
        ctx.fillRect(standX1 + 12 + d * ((standX2 - standX1 - 24) / 60), standY + 14 + r * 13, 3.4, 3.4);
      }
    }
  }
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'black 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('主看台 GRANDSTAND', (standX1 + standX2) / 2, standY + 78);

  // 夜賽泛光燈 (四角)
  if (isNight) {
    const towers: [number, number][] = [
      [shape.cx1 - 95, shape.cy - shape.r - 62],
      [shape.cx2 + 95, shape.cy - shape.r - 62],
      [shape.cx1 - 95, shape.cy + shape.r + 40],
      [shape.cx2 + 95, shape.cy + shape.r + 40],
    ];
    for (const [tx, ty] of towers) {
      const glow = ctx.createRadialGradient(tx, ty, 4, tx, ty, 120);
      glow.addColorStop(0, 'rgba(254, 240, 138, 0.30)');
      glow.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(tx - 120, ty - 120, 240, 240);
      ctx.fillStyle = '#334155';
      ctx.fillRect(tx - 3, ty, 6, 34);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(tx - 11, ty - 8, 22, 9);
    }
  }

  // ---------- 終點 ----------
  const fp = path.finishPoint;
  const fNormal = { x: Math.sin(fp.angle), y: -Math.cos(fp.angle) }; // 左法線 (內場方向)
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(fp.x - fNormal.x * (band / 2 + 4), fp.y - fNormal.y * (band / 2 + 4));
  ctx.lineTo(fp.x + fNormal.x * (band / 2 + 4), fp.y + fNormal.y * (band / 2 + 4));
  ctx.stroke();
  // 終點柱
  const polePos = { x: fp.x + fNormal.x * (band / 2 + 14), y: fp.y + fNormal.y * (band / 2 + 14) };
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(polePos.x - 4, polePos.y - 16, 8, 30);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(polePos.x - 4, polePos.y - 16, 8, 8);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'black 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('終點 FINISH', polePos.x, polePos.y + 30);

  // ---------- 起點閘 ----------
  const sp = path.startPoint;
  const sNormal = { x: Math.sin(sp.angle), y: -Math.cos(sp.angle) };
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(sp.x - sNormal.x * (band / 2), sp.y - sNormal.y * (band / 2));
  ctx.lineTo(sp.x + sNormal.x * (band / 2), sp.y + sNormal.y * (band / 2));
  ctx.stroke();
  for (let gIdx = -2; gIdx <= 2; gIdx++) {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(sp.x + sNormal.x * gIdx * 10 - 3, sp.y + sNormal.y * gIdx * 10 - 3, 6, 6);
  }
  ctx.fillStyle = '#fde047';
  ctx.font = '900 12px Arial, sans-serif';
  ctx.fillText(`起點 ${totalDist}M`, sp.x, sp.y - 38);

  // ---------- 剩餘途程標示 ----------
  ctx.textAlign = 'center';
  for (const remain of [800, 600, 400, 200]) {
    if (remain >= totalDist) continue;
    const p = path.pointAtRace(totalDist - remain);
    const n = { x: Math.sin(p.angle), y: -Math.cos(p.angle) };
    const bx = p.x - n.x * (band / 2 + 16);
    const by = p.y - n.y * (band / 2 + 16);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.beginPath();
    ctx.arc(bx, by, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(`${remain}`, bx, by + 3);
  }

  // ---------- 彎位標籤 ----------
  if (!path.isStraightCourse) {
    const bendLabels: { s: number; text: string }[] = [
      { s: (shape.cx2 - shape.cx1) + (Math.PI * shape.r) / 2, text: '彎位' },
      { s: 2 * (shape.cx2 - shape.cx1) + Math.PI * shape.r + (Math.PI * shape.r) / 2, text: '彎位' },
    ];
    ctx.font = 'black 13px sans-serif';
    for (const b of bendLabels) {
      const p = path.pointAtLoop(b.s);
      const out = { x: p.x - center.x, y: p.y - center.y };
      const len = Math.hypot(out.x, out.y) || 1;
      const lx = p.x + (out.x / len) * 52;
      const ly = p.y + (out.y / len) * 52;
      ctx.fillStyle = opts.fm ? 'rgba(2, 6, 23, 0.72)' : 'rgba(250, 204, 21, 0.92)';
      const wText = ctx.measureText(b.text).width + 14;
      ctx.beginPath();
      ctx.roundRect(lx - wText / 2, ly - 11, wText, 22, 6);
      ctx.fill();
      ctx.fillStyle = opts.fm ? '#e2e8f0' : '#422006';
      ctx.fillText(b.text, lx, ly + 5);
    }
  }

  // ---------- 馬匹標記 (彩衣圓球 + 名牌) ----------
  // 用圓球代替馬形圖示: 點陣圖示放大會起格，圓球 + 號碼 + 名牌點放大都清楚。
  // 名牌做自動避疊: 馬群逼埋一齊時，名牌會上下錯開並拉引線指返自己隻波。
  const ordered = [...horses].sort((a, b) => b.rank - a.rank); // 名次後先畫，領先最後畫 (在最上層)
  interface MarkerInfo {
    h: HorseSimulationState;
    x: number;
    y: number;
    angle: number;
  }
  const markers: MarkerInfo[] = ordered.map((h) => {
    const pos = path.pointAtRace(h.currentDistance);
    const leftN = { x: Math.sin(pos.angle), y: -Math.cos(pos.angle) };
    const laneOffset = 23 - h.lane * 11; // 跑道擴闊後疊位橫移同步攤開
    return { h, x: pos.x + leftN.x * laneOffset, y: pos.y + leftN.y * laneOffset, angle: pos.angle };
  });

  // 圓球避疊：馬群逼埋一齊時波會完全重疊、號碼冚住。要點 (用戶 2026-10-21 定案):
  // (1) 橢圓間距: 前後 58 / 橫向 30 (波直徑 20)，明顯距離;
  // (2) 連續性: 起點承接上一格顯示位置 (真位置揹 75%)，唔由零重計，走位先順;
  // (3) 名次順序鎖: 沿跑向軸，後名次的波唔可以越過前名次的波 (完場自動跟名次排)。
  const dispMap = new Map<string, { dx: number; dy: number; shifted: boolean }>();
  {
    // 終點壓縮: 最後 15% 途程起間距逐步收細 (至 45%)。成場馬壓喺終點前少少空間，
    // 若仍要全尺寸隊列，名次一交換後駒就被大幅推後 (實測跳 40-80 單位)。
    const leadDist = Math.max(...markers.map((m) => m.h.currentDistance));
    const ff =
      leadDist >= totalDist
        ? 0.45
        : leadDist > totalDist * 0.85
          ? 1 - 0.55 * ((leadDist - totalDist * 0.85) / (totalDist * 0.15))
          : 1;
    const AXIS_ALONG = 58 * ff; // 前後：再多一點距離 (用戶 2026-10-21)
    const AXIS_ACROSS = 30 * ff; // 左右：可以收窄 (用戶 2026-10-21)
    const ALONG_STEP = 34 * ff; // 順序鎖: 相鄰名次沿跑向至少相距
    const cacheKey = `${path.venue}|${totalDist}|${markers
      .map((m) => m.h.horseId)
      .sort()
      .join(',')}`;
    // 跳格防護: 拉進度條/轉鏡頭返嚟嗰陣，領先距離會跳一大段。舊位置同新幀真位置
    // 相距太遠嗰時唔准承接 — 承接會令啲波用幾格時間「流」返賽道，途中飛出界
    // (用戶實測投訴; 重現測試 scrub-test)。跳超過 30 米即當新一格由零重解。
    const prevPos =
      layoutCache && layoutCache.key === cacheKey && Math.abs(layoutCache.lead - leadDist) <= 30
        ? layoutCache.pos
        : null;
    const pts = markers.map((m) => {
      const prev = prevPos?.get(m.h.horseId);
      return {
        id: m.h.horseId,
        ox: m.x,
        oy: m.y,
        x: prev ? prev.x * 0.55 + m.x * 0.45 : m.x,
        y: prev ? prev.y * 0.55 + m.y * 0.45 : m.y,
        ang: m.angle,
        dist: m.h.currentDistance,
        rank: m.h.rank,
        w: 1 + (markers.length - m.h.rank) * 0.35, // 領先馬最重，盡量唔郁
      };
    });
    const tangentOf = (a: { ang: number }, b: { ang: number }) => {
      let txv = Math.cos(a.ang) + Math.cos(b.ang);
      let tyv = Math.sin(a.ang) + Math.sin(b.ang);
      const tl = Math.hypot(txv, tyv);
      if (tl < 0.01) return { x: 1, y: 0 };
      return { x: txv / tl, y: tyv / tl };
    };
    const enforceOrderEarly = () => {
      const byRank = [...pts].sort((p, q) => p.rank - q.rank);
      for (let k = 1; k < byRank.length; k++) {
        const lead = byRank[k - 1];
        const p = byRank[k];
        const T = tangentOf(lead, p);
        const rel = (p.x - lead.x) * T.x + (p.y - lead.y) * T.y;
        // 跟隊閘: 中段又唔接近嗰時唔鎖，啲波跟真位置獨立走 (唔好成隊火車咁跟);
        // 只在兩駒接近 (<=85) 或入了最後 30% 途程 (完場名次要對) 才鎖。
        const pairGap = Math.hypot(p.x - lead.x, p.y - lead.y);
        const mustLock = pairGap <= 85 || lead.dist >= totalDist * 0.7 || p.dist >= totalDist * 0.7;
        if (mustLock && rel > -ALONG_STEP) {
          const push = -ALONG_STEP - rel;
          p.x += T.x * push;
          p.y += T.y * push;
        }
      }
    };
    // 純推開、不回彈 (回彈會將密集群拉返埋一嚿，v2026.6.1/6.2 的教訓)。真幀可近至 14 隻擠在 25 米內。
    for (let iter = 0; iter < 260; iter++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (Math.hypot(dx, dy) < 0.01) {
            dx = (i - j) * 0.7 + 0.3;
            dy = ((i * 7 + j * 3) % 5) - 2;
          }
          const T = tangentOf(a, b);
          const dt = dx * T.x + dy * T.y; // 前後分量
          const dn = -dx * T.y + dy * T.x; // 橫向分量
          const e = Math.hypot(dt / AXIS_ALONG, dn / AXIS_ACROSS);
          if (e < 1 && e > 0.0001) {
            const grow = 1 / e - 1;
            const tot = a.w + b.w;
            a.x -= dx * grow * 0.5 * (b.w / tot);
            a.y -= dy * grow * 0.5 * (b.w / tot);
            b.x += dx * grow * 0.5 * (a.w / tot);
            b.y += dy * grow * 0.5 * (a.w / tot);
          }
        }
      }
      if (iter % 40 === 39) enforceOrderEarly();
      // 位移上限，避免波飛得太遠失真
      for (const p of pts) {
        const mx = p.x - p.ox;
        const my = p.y - p.oy;
        const md = Math.hypot(mx, my);
        if (md > 110) {
          p.x = p.ox + (mx / md) * 110;
          p.y = p.oy + (my / md) * 110;
        }
      }
    }
    // 名次順序鎖 (每 20 次迭代後做一次 + 最後做一次): 沿跑向逐名次掃，
    // 後一位的波越過前一位 (相距 < ALONG_STEP) 就沿跑向推後佢，橫向不變。
    const enforceOrder = () => {
      const byRank = [...pts].sort((p, q) => p.rank - q.rank);
      for (let k = 1; k < byRank.length; k++) {
        const lead = byRank[k - 1];
        const p = byRank[k];
        const T = tangentOf(lead, p);
        const rel = (p.x - lead.x) * T.x + (p.y - lead.y) * T.y;
        // 跟隊閘: 中段又唔接近嗰時唔鎖，啲波跟真位置獨立走 (唔好成隊火車咁跟);
        // 只在兩駒接近 (<=85) 或入了最後 30% 途程 (完場名次要對) 才鎖。
        const pairGap = Math.hypot(p.x - lead.x, p.y - lead.y);
        const mustLock = pairGap <= 85 || lead.dist >= totalDist * 0.7 || p.dist >= totalDist * 0.7;
        if (mustLock && rel > -ALONG_STEP) {
          const push = -ALONG_STEP - rel;
          p.x += T.x * push;
          p.y += T.y * push;
        }
      }
    };
    enforceOrder();
    // 同上一格顯示位置混合三成 + 每格移動上限 40：版面突變時滑過去，
    // 唔好成隻波瞬移 (用戶投訴的「突然去後面」)。超限的留待下一格由種子承接收尾。
    if (prevPos) {
      for (const p of pts) {
        const prev = prevPos.get(p.id);
        if (prev) {
          p.x = prev.x * 0.3 + p.x * 0.7;
          p.y = prev.y * 0.3 + p.y * 0.7;
          const mx = p.x - prev.x;
          const my = p.y - prev.y;
          const md = Math.hypot(mx, my);
          if (md > 40) {
            p.x = prev.x + (mx / md) * 40;
            p.y = prev.y + (my / md) * 40;
          }
        }
      }
    }
    for (const p of pts) {
      dispMap.set(p.id, { dx: p.x, dy: p.y, shifted: false });
    }
    layoutCache = {
      key: cacheKey,
      lead: leadDist,
      pos: new Map(pts.map((p) => [p.id, { x: p.x, y: p.y }])),
    };
    if (opts.onPositions) opts.onPositions(layoutCache.pos);
    if (opts.onLayout) {
      // 回報橢圓間距指標 (1.0 = 全部波對都達到目標間距)
      let minE = Infinity;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          let txv = Math.cos(a.ang) + Math.cos(b.ang);
          let tyv = Math.sin(a.ang) + Math.sin(b.ang);
          const tl = Math.hypot(txv, tyv) || 1;
          txv /= tl;
          tyv /= tl;
          const dt = dx * txv + dy * tyv;
          const dn = -dx * tyv + dy * txv;
          minE = Math.min(minE, Math.hypot(dt / AXIS_ALONG, dn / AXIS_ACROSS));
        }
      }
      opts.onLayout(minE);
    }
  }

  const silkTextColor = (hex: string): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return lum > 150 ? '#1c1917' : '#ffffff';
  };

  const BALL_R = 10;
  for (const { h, x: tx, y: ty, angle } of markers) {
    const disp = dispMap.get(h.horseId) ?? { dx: tx, dy: ty, shifted: false };
    const x = disp.dx;
    const y = disp.dy;
    const isPlayer = playerHorseIds.has(h.horseId);
    const isSelected = selectedHorseId === h.horseId;

    // 陰影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + BALL_R + 2, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 方向小箭頭 (指向前進方向)
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const perp = { x: -dir.y, y: dir.x };
    const tip = { x: x + dir.x * (BALL_R + 9), y: y + dir.y * (BALL_R + 9) };
    const b1 = { x: x + dir.x * (BALL_R - 2) + perp.x * 5.5, y: y + dir.y * (BALL_R - 2) + perp.y * 5.5 };
    const b2 = { x: x + dir.x * (BALL_R - 2) - perp.x * 5.5, y: y + dir.y * (BALL_R - 2) - perp.y * 5.5 };
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.closePath();
    ctx.fill();

    // 圓球本體 (彩衣色 + 圖案)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = h.silkColor || '#64748b';
    ctx.fillRect(x - BALL_R, y - BALL_R, BALL_R * 2, BALL_R * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    const pattern = opts.fm ? 0 : h.numberCloth % 4; // FM: 淨色圓點
    if (pattern === 1) {
      // 直間
      ctx.fillRect(x - 8, y - BALL_R, 5, BALL_R * 2);
      ctx.fillRect(x + 3, y - BALL_R, 5, BALL_R * 2);
    } else if (pattern === 2) {
      // 橫環
      ctx.fillRect(x - BALL_R, y - 3, BALL_R * 2, 6);
    } else if (pattern === 3) {
      // 圓點
      ctx.beginPath();
      ctx.arc(x, y - 6, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 外圈: 白圈 + 身份圈 (冠軍金圈 / 自家馬橙圈 / 選中綠圈)
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.stroke();
    if (h.rank === 1 || isPlayer || isSelected) {
      ctx.strokeStyle = h.rank === 1 ? '#fbbf24' : isPlayer ? '#f59e0b' : '#34d399';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, y, BALL_R + 3.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 號碼 (布號)
    const cloth = h.numberCloth ?? h.gate;
    ctx.fillStyle = silkTextColor(h.silkColor || '#64748b');
    ctx.font = `black ${Math.round(BALL_R * 1.08)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(cloth), x, y + 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.restore();

  // ---------- 左上角賽道資訊牌 ----------
  ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 208, 44, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fcd34d';
  ctx.font = '900 12px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${opts.venueNameZh} ・ ${totalDist}米`, 20, 29);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px sans-serif';
  ctx.fillText(
    path.isStraightCourse ? '直路賽 ・ 無彎位' : `全程 ${path.bendCount} 個彎位 ・ 賽道全長走線`,
    20,
    46
  );
}
