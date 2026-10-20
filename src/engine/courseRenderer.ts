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
  const band = 54; // 賽道闊度 (虛擬單位)

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
    const laneOffset = 17 - h.lane * 8.5;
    return { h, x: pos.x + leftN.x * laneOffset, y: pos.y + leftN.y * laneOffset, angle: pos.angle };
  });

  // 圓球避疊：馬群逼埋一齊時波會完全重疊、號碼冚住。用鬆弛迭代將太近的波
  // 沿兩軸推開 (名次越前權重越大、郁得越少)，再以幼線指回真實位置，資訊不失真。
  const dispMap = new Map<string, { dx: number; dy: number; shifted: boolean }>();
  {
    const MIN_D = 14 * 2 * 0.92;
    const pts = markers.map((m) => ({
      id: m.h.horseId,
      ox: m.x,
      oy: m.y,
      x: m.x,
      y: m.y,
      w: 1 + (markers.length - m.h.rank) * 0.35, // 領先馬最重，盡量唔郁
    }));
    // 純推開、不回彈 (回彈會將密集群拉返埋一嚿，v2026.6.1/6.2 的教訓)；
    // 位移靠上限 + 指回真位置的幼線保持誠實。真幀可近至 14 隻擠在 25 米內。
    for (let iter = 0; iter < 220; iter++) {
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let d = Math.hypot(dx, dy);
          if (d < 0.01) {
            dx = (i - j) * 0.7 + 0.3;
            dy = ((i * 7 + j * 3) % 5) - 2;
            d = Math.hypot(dx, dy) || 1;
          }
          if (d < MIN_D) {
            const deficit = MIN_D - d;
            const ux = dx / d;
            const uy = dy / d;
            const tot = a.w + b.w;
            a.x -= ux * deficit * 0.5 * (b.w / tot) * 2 * 0.5;
            a.y -= uy * deficit * 0.5 * (b.w / tot) * 2 * 0.5;
            b.x += ux * deficit * 0.5 * (a.w / tot) * 2 * 0.5;
            b.y += uy * deficit * 0.5 * (a.w / tot) * 2 * 0.5;
          }
        }
      }
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
    for (const p of pts) {
      dispMap.set(p.id, {
        dx: p.x,
        dy: p.y,
        shifted: Math.hypot(p.x - p.ox, p.y - p.oy) > 3,
      });
    }
    if (opts.onLayout) {
      let minP = Infinity;
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++)
          minP = Math.min(minP, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
      opts.onLayout(minP);
    }
  }

  const silkTextColor = (hex: string): string => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return lum > 150 ? '#1c1917' : '#ffffff';
  };

  const BALL_R = 14;
  for (const { h, x: tx, y: ty, angle } of markers) {
    const disp = dispMap.get(h.horseId) ?? { dx: tx, dy: ty, shifted: false };
    const x = disp.dx;
    const y = disp.dy;
    const isPlayer = playerHorseIds.has(h.horseId);
    const isSelected = selectedHorseId === h.horseId;

    // 被推開的圓球：幼線 + 白點標示真實位置
    if (disp.shifted) {
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
    }

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
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
    ctx.stroke();
    if (h.rank === 1 || isPlayer || isSelected) {
      ctx.strokeStyle = h.rank === 1 ? '#fbbf24' : isPlayer ? '#f59e0b' : '#34d399';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(x, y, BALL_R + 4.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 號碼 (布號)
    const cloth = h.numberCloth ?? h.gate;
    ctx.fillStyle = silkTextColor(h.silkColor || '#64748b');
    ctx.font = 'black 14px sans-serif';
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
