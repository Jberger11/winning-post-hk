// ============================================================
// 直播追蹤鏡頭 (Side Tracking / TV Broadcast Cam)
// 側面視角跟住焦點馬：向量奔馬大圖、視差看台、欄杆、
// 草地滾動條紋、距離標示柱。唔用鏡頭 transform 縮放，
// 全部以原生解析度繪製，所以點睇都唔會起格。
// ============================================================

import type { HorseSimulationState } from '../types/race';
import { coatForIndex, drawVectorGallopHorse, gallopPhase } from './horseArt';

export interface SideViewOptions {
  width: number;
  height: number;
  horses: HorseSimulationState[];
  totalDist: number;
  isDirt: boolean;
  isNight: boolean;
  venueNameZh: string;
  playerHorseIds: Set<string>;
  selectedHorseId?: string | null;
}

// 世界間距與馬匹大細改為跟畫布闊度計 (見 drawSideTrackingView 內)
let camDist: number | null = null;
let camKey = '';

function seeded(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export function drawSideTrackingView(ctx: CanvasRenderingContext2D, opts: SideViewOptions): void {
  const { width: W, height: H, horses, totalDist } = opts;

  // 焦點馬：選中 > 自家最佳 > 領先
  const ordered = [...horses].sort((a, b) => a.rank - b.rank);
  const focus =
    (opts.selectedHorseId ? horses.find((h) => h.horseId === opts.selectedHorseId) : undefined) ||
    ordered.find((h) => opts.playerHorseIds.has(h.horseId)) ||
    ordered[0];

  // 鏡頭平滑跟隨 (新賽事 / 重播回到起點時重置)
  const key = `${totalDist}|${horses.map((h) => h.horseId).join(',')}`;
  if (camKey !== key || camDist === null) {
    camKey = key;
    camDist = focus ? focus.currentDistance : 0;
  }
  if (focus) {
    if (focus.currentDistance < camDist - 60) {
      camDist = focus.currentDistance; // 重播/新一場：直接跳回起點，唔好慢慢碌返去
    } else {
      camDist += (focus.currentDistance - camDist) * 0.16;
    }
  }
  const cam = camDist;
  const PX_M = W / 108; // 可視賽道長度約 108 米，任何畫面闊度都一致
  const ART_BASE = Math.max(21, Math.min(35, W * 0.036)); // 馬匹每米像素
  const anchorX = W * 0.40;
  const worldX = (d: number) => anchorX + (d - cam) * PX_M;

  // ---------- 天空 ----------
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.52);
  if (opts.isNight) {
    sky.addColorStop(0, '#0b1226');
    sky.addColorStop(1, '#1e293b');
  } else {
    sky.addColorStop(0, '#38bdf8');
    sky.addColorStop(1, '#bae6fd');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H * 0.55);

  // ---------- 樹林帶 (視差 0.15，油畫感背景) ----------
  const treeOff = -((cam * PX_M * 0.15) % 54);
  const treePalette = opts.isNight
    ? ['#14532d', '#166534', '#1a2e05', '#134e4a']
    : ['#3f6212', '#4d7c0f', '#65a30d', '#b45309', '#a16207'];
  for (let tx = -1; tx < W / 54 + 2; tx++) {
    const bx = tx * 54 + treeOff;
    const s = seeded(tx * 7.3 + Math.floor((cam * PX_M * 0.15) / 54) * 3.1);
    const baseY = H * 0.315;
    const canopyY = baseY - 26 - s * 26;
    ctx.fillStyle = opts.isNight ? '#0f2417' : '#5b4636';
    ctx.fillRect(bx + 12 + s * 8, canopyY + 12, 4, baseY - canopyY - 8);
    for (let c = 0; c < 3; c++) {
      const cs = seeded(tx * 13.7 + c * 29.3 + s * 7);
      ctx.fillStyle = treePalette[Math.floor(cs * treePalette.length) % treePalette.length];
      ctx.globalAlpha = opts.isNight ? 0.85 : 0.92;
      ctx.beginPath();
      ctx.arc(bx + 6 + c * 11 + cs * 6, canopyY + (c % 2) * 9, 15 + cs * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // ---------- 看台 (視差 0.25) ----------
  const standY = H * 0.30;
  const standH = H * 0.185;
  ctx.fillStyle = opts.isNight ? '#111827' : '#334155';
  ctx.fillRect(0, standY, W, standH);
  ctx.fillStyle = opts.isNight ? '#1f2937' : '#475569';
  ctx.fillRect(0, standY, W, 10);
  // 觀眾點陣 (跟鏡頭慢移)
  const crowdOff = -((cam * PX_M * 0.25) % 7);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < W / 7 + 2; x++) {
      const s = seeded(x * 13.7 + y * 91.3);
      if (s < 0.42) continue;
      ctx.fillStyle = ['#fbbf24', '#f8fafc', '#f87171', '#93c5fd', '#86efac'][Math.floor(s * 5) % 5];
      ctx.globalAlpha = opts.isNight ? 0.5 : 0.75;
      ctx.fillRect(x * 7 + crowdOff + (s % 0.3) * 6, standY + 16 + y * ((standH - 22) / 5), 2.6, 2.6);
    }
  }
  ctx.globalAlpha = 1;
  // 夜間射燈
  if (opts.isNight) {
    for (const lx of [W * 0.18, W * 0.82]) {
      const glow = ctx.createRadialGradient(lx, standY - 6, 4, lx, standY - 6, 90);
      glow.addColorStop(0, 'rgba(254, 249, 195, 0.85)');
      glow.addColorStop(1, 'rgba(254, 249, 195, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, standY - 6, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef9c3';
      ctx.fillRect(lx - 14, standY - 12, 28, 6);
    }
  }

  // ---------- 地面 ----------
  const turfTop = H * 0.52;
  const ground = ctx.createLinearGradient(0, turfTop, 0, H);
  if (opts.isDirt) {
    ground.addColorStop(0, '#a16207');
    ground.addColorStop(0.25, '#854d0e');
    ground.addColorStop(1, '#713f12');
  } else if (opts.isNight) {
    ground.addColorStop(0, '#166534');
    ground.addColorStop(0.25, '#14532d');
    ground.addColorStop(1, '#052e16');
  } else {
    ground.addColorStop(0, '#22c55e');
    ground.addColorStop(0.25, '#16a34a');
    ground.addColorStop(1, '#15803d');
  }
  ctx.fillStyle = ground;
  ctx.fillRect(0, turfTop, W, H - turfTop);
  // 滾動刈草條紋 (30 米一條，跟鏡頭全速移)
  if (!opts.isDirt) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
    const stripeW = 30 * PX_M;
    const startStripe = Math.floor((cam - anchorX / PX_M) / 30) * 30;
    for (let d = startStripe; d < cam + (W - anchorX) / PX_M + 30; d += 30) {
      if ((d / 30) % 2 === 0) ctx.fillRect(worldX(d), turfTop, stripeW, H - turfTop);
    }
  }
  // 遠欄 (白欄 + 欄柱)
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, turfTop + 4);
  ctx.lineTo(W, turfTop + 4);
  ctx.stroke();
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  const postSpacing = 25;
  const firstPost = Math.floor((cam - anchorX / PX_M) / postSpacing) * postSpacing;
  for (let d = firstPost; d < cam + (W - anchorX) / PX_M + postSpacing; d += postSpacing) {
    const px = worldX(d);
    ctx.fillRect(px, turfTop - 8, 3, 14);
    // 斜撐 (參考實況畫面嘅欄杆支架)
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 1, turfTop + 3);
    ctx.lineTo(px - 11, turfTop + 17);
    ctx.stroke();
  }

  // ---------- 距離標示柱 ----------
  ctx.textAlign = 'center';
  for (const remain of [800, 600, 400, 200]) {
    const d = totalDist - remain;
    if (d < 0) continue;
    const x = worldX(d);
    if (x < -40 || x > W + 40) continue;
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 2, turfTop - 34, 4, 30);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(x, turfTop - 42, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = '900 10px Arial, sans-serif';
    ctx.fillText(String(remain), x, turfTop - 38.5);
  }
  // 終點柱
  {
    const x = worldX(totalDist);
    if (x > -40 && x < W + 40) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 2, turfTop - 52, 5, 48);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x - 2, turfTop - 52, 5, 10);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '900 10px Arial, sans-serif';
      ctx.fillText('FINISH', x, turfTop - 58);
    }
  }
  // 起點標示
  {
    const x = worldX(0);
    if (x > -40 && x < W + 40) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(x - 2, turfTop - 40, 4, 36);
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('起點', x, turfTop - 46);
    }
  }

  // ---------- 馬匹 (遠行先畫，近行後畫；同行落後先畫) ----------
  const rowOf = (h: HorseSimulationState) => Math.min(5, Math.max(0, h.lane || 0));
  const drawList = [...horses].sort((a, b) => rowOf(a) - rowOf(b) || a.currentDistance - b.currentDistance);
  for (const h of drawList) {
    const row = rowOf(h);
    const groundY = H * 0.665 + row * (H * 0.052);
    const scale = ART_BASE + row * ART_BASE * 0.09;
    const x = worldX(h.currentDistance);
    if (x < -160 || x > W + 160) continue;

    // 泥地塵土
    if (opts.isDirt) {
      ctx.fillStyle = 'rgba(214, 178, 128, 0.35)';
      for (let i = 0; i < 3; i++) {
        const s = seeded(h.gate * 31 + Math.floor(h.currentDistance / 2.2) * 7 + i * 13);
        ctx.beginPath();
        ctx.arc(x - 34 - i * 13 - s * 8, groundY - 3 - s * 7, 4.5 + s * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    drawVectorGallopHorse(ctx, {
      x,
      y: groundY,
      scale,
      phase: gallopPhase(h.currentDistance, h.currentSpeed),
      coat: coatForIndex(h.gate + h.numberCloth),
      silk: h.silkColor || '#64748b',
      silkPattern: h.numberCloth % 4,
      cloth: h.numberCloth,
      sprint: h.isSprinting,
    });

    // 焦點馬標記 (金三角 + 名牌，只標一隻，唔會再疊)
    if (focus && h.horseId === focus.horseId) {
      const topY = groundY - 1.78 * scale;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(x, topY + 12);
      ctx.lineTo(x - 7, topY);
      ctx.lineTo(x + 7, topY);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 11px sans-serif';
      const label = `${h.numberCloth} ${h.horseNameZh}`;
      const w = ctx.measureText(label).width + 14;
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.roundRect(x - w / 2, topY - 20, w, 17, 5);
      ctx.fill();
      ctx.fillStyle = '#fcd34d';
      ctx.fillText(label, x, topY - 7.5);
    }
  }

  // ---------- 左下資訊牌 ----------
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.beginPath();
  ctx.roundRect(10, H - 40, 216, 30, 7);
  ctx.fill();
  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(
    focus
      ? `直播追蹤：${focus.numberCloth}號 ${focus.horseNameZh}（第 ${focus.rank} 位）`
      : `直播追蹤：${opts.venueNameZh}`,
    18,
    H - 21
  );
}
