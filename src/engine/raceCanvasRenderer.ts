// ==========================================
// 賽馬 2.5D 電視直播畫布渲染引擎 (Race Canvas Renderer)
// 支援 4 款視角：電視直播、愛駒特寫、直路衝線、戰術無人機
// 包含骨骼關節奔馳動畫、草地泥屑粒子、末段爆發光芒
// ==========================================

import { HorseSimulationState } from '../types/race';

export type CameraMode = 'broadcast' | 'player' | 'finish' | 'tactical';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

// 粒子池管理
export class ParticleSystem {
  public particles: Particle[] = [];

  public emitTurf(x: number, y: number, isDirt: boolean, speedRatio: number) {
    const count = Math.floor(2 + Math.random() * 3 * speedRatio);
    const colors = isDirt
      ? ['#8b4513', '#a0522d', '#cd853f', '#6b3e11']
      : ['#15803d', '#166534', '#4ade80', '#2e1065'];

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 8 - 4),
        y: y + (Math.random() * 4 - 2),
        vx: -(4 + Math.random() * 8 * speedRatio),
        vy: -(1 + Math.random() * 3.5),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 2.5,
        life: 1.0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  }

  public emitSpeedTrail(x: number, y: number) {
    this.particles.push({
      x: x + (Math.random() * 6 - 3),
      y: y + (Math.random() * 8 - 4),
      vx: -(8 + Math.random() * 6),
      vy: (Math.random() - 0.5) * 1.5,
      color: Math.random() > 0.4 ? '#facc15' : '#fb923c',
      size: 2.5 + Math.random() * 3,
      life: 1.0,
      maxLife: 15 + Math.random() * 10,
    });
  }

  public updateAndDraw(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // 重力
      p.life -= 1 / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = p.life * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public clear() {
    this.particles = [];
  }
}

// 根據綵衣生成深色或毛色組合
function getHorseCoatColor(silkColor: string, index: number): string {
  const coats = ['#451a03', '#78350f', '#292524', '#57534e', '#92400e', '#3f1d0b'];
  return coats[index % coats.length];
}

// 繪製單匹疾馳賽駒與騎師 (側身視角)
export function drawSideGallopingHorse(
  ctx: CanvasRenderingContext2D,
  h: HorseSimulationState,
  screenX: number,
  screenY: number,
  scale: number,
  isPlayerOwned: boolean,
  isLeader: boolean,
  isSelected: boolean,
  stridePhase: number,
  particleSys: ParticleSystem,
  isDirt: boolean
) {
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.scale(scale, scale);

  const coatColor = getHorseCoatColor(h.silkColor, h.gate);
  const silkColor = h.silkColor || '#f59e0b';
  const speed = h.currentSpeed || 16;
  const isSprinting = h.isSprinting;

  // 1. 產生草地泥屑粒子
  if (Math.sin(stridePhase) > 0.8) {
    particleSys.emitTurf(screenX - 20 * scale, screenY + 12 * scale, isDirt, speed / 16);
  }
  if (isSprinting && h.currentEnergy > 20) {
    particleSys.emitSpeedTrail(screenX - 18 * scale, screenY + 4 * scale);
  }

  // 2. 馬匹地面疾馳陰影 (動態隨步幅擴張)
  const shadowScale = 1.0 + Math.sin(stridePhase) * 0.2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 26 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fill();

  // 末段衝刺能量光芒 (Aura)
  if (isSprinting && h.currentEnergy > 15) {
    ctx.save();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 4;
    ctx.filter = 'blur(3px)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 30, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 3. 後腿 (遠端深色腿)
  drawLeg(ctx, -14, 6, stridePhase, coatColor, true, true);
  // 前腿 (遠端深色腿)
  drawLeg(ctx, 16, 4, stridePhase + 1.2, coatColor, false, true);

  // 4. 馬匹身軀 (Barrel & Flank)
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.ellipse(0, 4, 22, 11, -0.05, 0, Math.PI * 2);
  ctx.fill();

  // 馬臀 (Croup & Haunch)
  ctx.beginPath();
  ctx.arc(-14, 2, 10, 0, Math.PI * 2);
  ctx.fill();

  // 馬肩 (Shoulder)
  ctx.beginPath();
  ctx.arc(14, 2, 9, 0, Math.PI * 2);
  ctx.fill();

  // 5. 馬鞍與號布 (Number Cloth / Saddle Pad)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(-7, -4, 15, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 號布編號
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${h.numberCloth}`, 0.5, 2.5);

  // 6. 馬頸與馬頭 (Neck & Head)
  const headBob = Math.sin(stridePhase * 2) * 2.5;
  ctx.save();
  ctx.translate(14, -1 + headBob * 0.4);

  // 頸部
  ctx.fillStyle = coatColor;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(12, -14);
  ctx.lineTo(19, -11);
  ctx.lineTo(8, 7);
  ctx.closePath();
  ctx.fill();

  // 馬頭
  ctx.beginPath();
  ctx.moveTo(11, -14);
  ctx.lineTo(24, -10);
  ctx.lineTo(23, -5);
  ctx.lineTo(13, -7);
  ctx.closePath();
  ctx.fill();

  // 馬耳
  ctx.beginPath();
  ctx.moveTo(10, -14);
  ctx.lineTo(12, -19);
  ctx.lineTo(14, -14);
  ctx.fill();

  // 韁繩與鼻帶 (Bridle)
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(13, -12);
  ctx.lineTo(21, -8);
  ctx.stroke();

  ctx.restore();

  // 7. 飄逸馬尾 (Tail with Sinusoidal Physics)
  ctx.strokeStyle = coatColor;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const tailWave = Math.sin(stridePhase * 2) * 5;
  ctx.moveTo(-22, 2);
  ctx.quadraticCurveTo(-30, 4 + tailWave, -36, 12 + tailWave);
  ctx.stroke();

  // 8. 騎師 (Jockey in HKJC Crouch Posture)
  ctx.save();
  ctx.translate(0, -6 + headBob * 0.3);

  // 騎師下半身 / 白褲
  ctx.fillStyle = '#e2e8f0';
  ctx.beginPath();
  ctx.ellipse(-2, 3, 6, 4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 騎師軀幹 (綵衣 Silk Color)
  ctx.fillStyle = silkColor;
  ctx.beginPath();
  ctx.ellipse(2, -4, 7, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 綵衣條紋或星星點綴
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(2, -4, 2, 0, Math.PI * 2);
  ctx.fill();

  // 騎師手臂與拉韁
  ctx.strokeStyle = silkColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(5, -4);
  ctx.lineTo(14, 0);
  ctx.stroke();

  // 催策開鞭手臂 (Whipping Action during straight sprint)
  if (isSprinting) {
    const whipAngle = Math.sin(stridePhase * 3) * 0.8;
    ctx.strokeStyle = silkColor;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-4 + Math.cos(whipAngle) * 7, -12 + Math.sin(whipAngle) * 5);
    ctx.stroke();

    // 馬鞭 (Whip Stick)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4 + Math.cos(whipAngle) * 7, -12 + Math.sin(whipAngle) * 5);
    ctx.lineTo(-6 + Math.cos(whipAngle) * 16, -17 + Math.sin(whipAngle) * 10);
    ctx.stroke();
  }

  // 騎師頭盔與風鏡 (Helmet & Goggles)
  ctx.fillStyle = silkColor;
  ctx.beginPath();
  ctx.arc(6, -9, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 風鏡 (Goggles)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.roundRect(8, -9, 3, 2.5, 1);
  ctx.fill();

  ctx.restore();

  // 9. 近端前腿與後腿 (近端較亮)
  drawLeg(ctx, -12, 6, stridePhase + 0.35, coatColor, true, false);
  drawLeg(ctx, 18, 4, stridePhase + 1.55, coatColor, false, false);

  // 10. 馬名與狀態標籤
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  // 玩家愛駒高亮徽章
  if (isPlayerOwned) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText('⭐ 我的愛駒', 0, -28);
  }

  // 馬名標籤
  ctx.font = isLeader ? 'bold 11px sans-serif' : '10px sans-serif';
  ctx.fillStyle = isLeader ? '#fef08a' : isPlayerOwned ? '#38bdf8' : isSelected ? '#a7f3d0' : '#ffffff';
  ctx.fillText(h.horseNameZh, 0, isPlayerOwned ? -18 : -16);

  // 受阻警示
  if (h.isBlocked) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 9px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('⚠️受阻', 0, 24);
  }

  // 衝刺標記
  if (isSprinting && !h.isBlocked) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('🔥衝刺', 0, 24);
  }

  ctx.restore();
}

// 輔助繪製單條奔馳腿 (三段關節動力學)
function drawLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  phase: number,
  coatColor: string,
  isHind: boolean,
  isFar: boolean
) {
  ctx.save();
  ctx.strokeStyle = isFar ? '#1c1917' : coatColor;
  ctx.lineWidth = isFar ? 3.0 : 3.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sinP = Math.sin(phase);
  const cosP = Math.cos(phase);

  if (isHind) {
    // 後腿關節 (大腿 -> 飛節 Hock -> 蹄)
    const kneeX = hipX - 3 + sinP * 10;
    const kneeY = hipY + 8 + Math.abs(cosP) * 5;
    const hoofX = kneeX - 4 + cosP * 12;
    const hoofY = hipY + 18 + Math.max(-2, sinP * 6);

    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(hoofX, hoofY);
    ctx.stroke();

    // 蹄子 (Hoof)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hoofX, hoofY, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 前腿關節 (肩 -> 膝 -> 蹄)
    const kneeX = hipX + 2 + sinP * 12;
    const kneeY = hipY + 8 + Math.abs(cosP) * 4;
    const hoofX = kneeX + 4 + cosP * 10;
    const hoofY = hipY + 18 + Math.max(-2, -sinP * 5);

    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(kneeX, kneeY);
    ctx.lineTo(hoofX, hoofY);
    ctx.stroke();

    // 蹄子 (Hoof)
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(hoofX, hoofY, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 繪製直路衝線正面視角 (Head-On Finish Cam)
export function drawHeadOnFinishCam(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horses: HorseSimulationState[],
  totalDist: number,
  isDirt: boolean,
  playerHorseIds: Set<string>
) {
  // 背景天空與看台
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
  skyGrad.addColorStop(0, '#020617');
  skyGrad.addColorStop(1, '#0f172a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.45);

  // 遠方大看台剪影
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.45);
  ctx.lineTo(width * 0.2, height * 0.28);
  ctx.lineTo(width * 0.8, height * 0.28);
  ctx.lineTo(width, height * 0.45);
  ctx.closePath();
  ctx.fill();

  // 3D 透視賽道 (草地或泥地梯形)
  const trackGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
  if (isDirt) {
    trackGrad.addColorStop(0, '#451a03');
    trackGrad.addColorStop(1, '#78350f');
  } else {
    trackGrad.addColorStop(0, '#064e3b');
    trackGrad.addColorStop(1, '#022c22');
  }
  ctx.fillStyle = trackGrad;
  ctx.beginPath();
  ctx.moveTo(width * 0.28, height * 0.45);
  ctx.lineTo(width * 0.72, height * 0.45);
  ctx.lineTo(width + 80, height);
  ctx.lineTo(-80, height);
  ctx.closePath();
  ctx.fill();

  // 左右欄杆 (3D Rails)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width * 0.28, height * 0.45);
  ctx.lineTo(-80, height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width * 0.72, height * 0.45);
  ctx.lineTo(width + 80, height);
  ctx.stroke();

  // 終點線 (Finish Line across the foreground)
  const finishY = height - 35;
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-50, finishY);
  ctx.lineTo(width + 50, finishY);
  ctx.stroke();

  // 終點柱 (Winning Post Pole)
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(width * 0.08, height * 0.35, 14, height * 0.65);
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(width * 0.08, height * 0.35, 14, 25);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FINISH', width * 0.08 + 20, height * 0.38);

  // 依離終點距離排序 (遠處先畫，近處後畫避免遮擋)
  const sortedHorses = [...horses].sort((a, b) => a.currentDistance - b.currentDistance);

  for (const h of sortedHorses) {
    const remainDist = Math.max(0, totalDist - h.currentDistance);
    // 透視比例 (0m = scale 1.4, 200m = scale 0.35)
    const perspective = Math.max(0.25, Math.min(1.4, 1.4 - remainDist / 160));
    const laneRatio = (h.lane - 2) / 3.0; // -1 to +1
    const horseScreenX = width * 0.5 + laneRatio * (width * 0.38) * perspective;
    const horseScreenY = height * 0.45 + (1 - remainDist / totalDist) * (height * 0.5);

    drawFrontGallopingHorse(ctx, h, horseScreenX, horseScreenY, perspective, playerHorseIds.has(h.horseId));
  }
}

// 繪製正面奔向鏡頭之賽駒
function drawFrontGallopingHorse(
  ctx: CanvasRenderingContext2D,
  h: HorseSimulationState,
  x: number,
  y: number,
  scale: number,
  isPlayerOwned: boolean
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const silkColor = h.silkColor || '#f59e0b';

  // 陰影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 馬胸與前腿
  ctx.fillStyle = '#451a03';
  ctx.beginPath();
  ctx.ellipse(0, 8, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 左右前腿
  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-9, 14);
  ctx.lineTo(-12, 28);
  ctx.moveTo(9, 14);
  ctx.lineTo(12, 28);
  ctx.stroke();

  // 馬頭與面罩
  ctx.fillStyle = '#57534e';
  ctx.beginPath();
  ctx.ellipse(0, -2, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // 馬鼻
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.arc(0, 7, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // 騎師正面 (Crouched)
  ctx.fillStyle = silkColor;
  ctx.beginPath();
  ctx.ellipse(0, -18, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // 頭盔與風鏡
  ctx.fillStyle = silkColor;
  ctx.beginPath();
  ctx.arc(0, -26, 6.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-5, -27, 10, 3);

  // 標籤
  ctx.fillStyle = isPlayerOwned ? '#38bdf8' : '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${h.numberCloth} ${h.horseNameZh}`, 0, -36);

  ctx.restore();
}

// 繪製戰術無人機俯瞰全景視角 (Tactical Drone Cam)
export function drawTacticalDroneCam(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  horses: HorseSimulationState[],
  totalDist: number,
  isDirt: boolean,
  playerHorseIds: Set<string>,
  selectedHorseId: string | null
) {
  // 草皮底色
  ctx.fillStyle = isDirt ? '#451a03' : '#064e3b';
  ctx.fillRect(0, 0, width, height);

  const padX = 50;
  const padY = 50;
  const trackW = width - 100;
  const trackH = height - 100;
  const laneH = trackH / 5;

  // 5 條疊道 (Lanes 0 to 4)
  for (let l = 0; l < 5; l++) {
    ctx.fillStyle = l % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(padX, padY + l * laneH, trackW, laneH);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(padX, padY + l * laneH);
    ctx.lineTo(padX + trackW, padY + l * laneH);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // 內欄白線 (Rail)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padX, padY);
  ctx.lineTo(padX + trackW, padY);
  ctx.stroke();

  // 終點線
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(padX + trackW, padY - 10);
  ctx.lineTo(padX + trackW, padY + trackH + 10);
  ctx.stroke();
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('FINISH', padX + trackW - 20, padY - 16);

  // 馬匹點陣與戰術方塊
  for (const h of horses) {
    const progress = Math.min(1.0, h.currentDistance / totalDist);
    const hX = padX + progress * trackW;
    const hY = padY + (h.lane + 0.5) * laneH;
    const isPlayer = playerHorseIds.has(h.horseId);
    const isSelected = selectedHorseId === h.horseId;

    // 戰術光圈
    ctx.fillStyle = h.silkColor || '#f59e0b';
    ctx.beginPath();
    ctx.arc(hX, hY, isPlayer ? 14 : 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isPlayer ? '#38bdf8' : isSelected ? '#34d399' : '#ffffff';
    ctx.lineWidth = isPlayer || isSelected ? 3 : 1.5;
    ctx.stroke();

    // 號布
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${h.numberCloth}`, hX, hY);

    // 名字
    ctx.fillStyle = isPlayer ? '#38bdf8' : '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textBaseline = 'bottom';
    ctx.fillText(h.horseNameZh, hX, hY - 14);

    if (h.isBlocked) {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('⚠️受阻', hX, hY + 14);
    }
  }
}
