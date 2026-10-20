// ============================================================
// 向量奔馬圖 (Vector Gallop Horse)
// 全部用貝茲曲線 + 分段四肢程序化繪製，唔用任何點陣圖，
// 所以放大幾多都唔會起格。四肢用旋轉馳騁 (rotary gallop)
// 步法相位驅動：後腳先蹬、前腳跟隨、懸空期收腳，
// 身軀隨步法起伏同俯仰，頸頭輕微伸縮，馬尾飄動。
// 單位：1 unit = 1 米；馬身中心為原點，地面在 y = +1.35。
// ============================================================

export interface GallopHorseOptions {
  /** 場地座標：馬匹中心對落的地面點 */
  x: number;
  y: number;
  /** 每米像素 (決定馬匹大小) */
  scale: number;
  /** 奔跑相位 (弧度，隨距離推進) */
  phase: number;
  /** 毛色 (十六進制) */
  coat: string;
  /** 騎師綵衣顏色 */
  silk: string;
  /** 綵衣圖案編號 (與布號取模一致) */
  silkPattern: number;
  /** 馬布號碼 */
  cloth: number;
  /** 是否衝刺 (頸伸得更長、速度線) */
  sprint?: boolean;
  /** 是否水平翻轉 (面向左) */
  flip?: boolean;
}

const COATS = ['#6b3410', '#7c4a1e', '#4a2c14', '#8a5a2b', '#3a3a3a', '#9c6b30', '#5d3a1a', '#78716c'];

export function coatForIndex(index: number): string {
  return COATS[Math.abs(index) % COATS.length];
}

function shade(hex: string, f: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * f)));
  return `rgb(${r}, ${g}, ${b})`;
}

interface LegPose {
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
}

/**
 * 計算一隻腳在某相位的姿勢。
 * swing: 擺動角 (正 = 向前)；fold: 摺曲程度 (收腳時下段向後摺)。
 */
function legPose(anchorX: number, anchorY: number, t: number, isHind: boolean): LegPose {
  const L1 = 0.56;
  const L2 = 0.58;
  const swing = Math.sin(t) * 0.78;
  const foldRaw = Math.max(0, Math.sin(t - 0.9));
  const fold = foldRaw * foldRaw * (isHind ? 0.9 : 1.25);
  const kneeX = anchorX + Math.sin(swing) * L1;
  const kneeY = anchorY + Math.cos(swing) * L1;
  const lowerAngle = swing + (isHind ? fold : -fold);
  const footX = kneeX + Math.sin(lowerAngle) * L2;
  const footY = kneeY + Math.cos(lowerAngle) * L2;
  return { kneeX, kneeY, footX, footY };
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  t: number,
  isHind: boolean,
  color: string,
  widthMul: number
) {
  const pose = legPose(anchorX, anchorY, t, isHind);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  // 上段
  ctx.lineWidth = 0.145 * widthMul;
  ctx.beginPath();
  ctx.moveTo(anchorX, anchorY);
  ctx.lineTo(pose.kneeX, pose.kneeY);
  ctx.stroke();
  // 下段
  ctx.lineWidth = 0.095 * widthMul;
  ctx.beginPath();
  ctx.moveTo(pose.kneeX, pose.kneeY);
  ctx.lineTo(pose.footX, pose.footY);
  ctx.stroke();
  // 蹄
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.ellipse(pose.footX + 0.03, pose.footY, 0.075, 0.045, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawVectorGallopHorse(ctx: CanvasRenderingContext2D, o: GallopHorseOptions): void {
  const p = o.phase;
  const coat = o.coat;
  const coatDark = shade(coat, 0.62);
  const coatLight = shade(coat, 1.28);
  const maneColor = shade(coat, 0.38);

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(o.flip ? -o.scale : o.scale, o.scale);

  // 地面陰影 (唔跟身軀起伏)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.beginPath();
  ctx.ellipse(0.05, 0.02, 1.18, 0.085, 0, 0, Math.PI * 2);
  ctx.fill();

  // 速度線 (衝刺時)
  if (o.sprint) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 0.035;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ly = -1.15 + i * 0.28;
      const lx = -1.25 - ((p * 2 + i * 0.9) % 0.5);
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx - 0.42, ly);
      ctx.stroke();
    }
  }

  const bob = Math.sin(p * 2 + 0.6) * 0.028 - Math.max(0, Math.sin(p + 0.4)) * 0.045;
  const pitch = Math.sin(p + 0.5) * 0.035;

  ctx.save();
  ctx.translate(0, -1.32 + bob);
  ctx.rotate(pitch);

  // 步法相位 (rotary gallop)：近後 → 遠後 → 近前 → 遠前
  const tHindNear = p;
  const tHindFar = p + 0.45;
  const tForeNear = p + Math.PI + 0.35;
  const tForeFar = p + Math.PI + 0.8;

  // 遠側腳 (先畫，較深色)
  drawLeg(ctx, -0.60, 0.14, tHindFar, true, coatDark, 0.92);
  drawLeg(ctx, 0.56, 0.16, tForeFar, false, coatDark, 0.92);

  // 馬尾 (由臀部向後下飄)
  const tailWave = Math.sin(p + 1.2) * 0.07;
  ctx.fillStyle = maneColor;
  ctx.beginPath();
  ctx.moveTo(-0.88, -0.24);
  ctx.bezierCurveTo(-1.18, -0.10 + tailWave, -1.34, 0.22, -1.30, 0.52 + tailWave);
  ctx.bezierCurveTo(-1.22, 0.30, -1.10, 0.10, -0.80, -0.02);
  ctx.closePath();
  ctx.fill();

  // 身軀
  const bodyGrad = ctx.createLinearGradient(0, -0.38, 0, 0.38);
  bodyGrad.addColorStop(0, coatLight);
  bodyGrad.addColorStop(0.45, coat);
  bodyGrad.addColorStop(1, coatDark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(0.80, -0.20);
  ctx.bezierCurveTo(0.42, -0.35, -0.28, -0.37, -0.76, -0.27);
  ctx.bezierCurveTo(-0.94, -0.22, -0.99, 0.00, -0.91, 0.15);
  ctx.bezierCurveTo(-0.82, 0.30, -0.45, 0.37, -0.08, 0.35);
  ctx.bezierCurveTo(0.32, 0.37, 0.64, 0.30, 0.79, 0.13);
  ctx.bezierCurveTo(0.89, 0.01, 0.89, -0.11, 0.80, -0.20);
  ctx.closePath();
  ctx.fill();
  // 後肢肌肉弧線 + 肩部弧線 (輕描)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.lineWidth = 0.03;
  ctx.beginPath();
  ctx.arc(-0.58, 0.02, 0.30, -0.6, 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0.55, 0.0, 0.27, -1.2, 0.9);
  ctx.stroke();

  // 頸 + 頭 (以肩為軸輕微伸縮)
  const neckStretch = o.sprint ? 0.05 : 0.0;
  ctx.save();
  ctx.translate(0.70, -0.16);
  ctx.rotate(Math.sin(p + 0.8) * 0.045 - (o.sprint ? 0.06 : 0));
  // 頸
  const neckGrad = ctx.createLinearGradient(0, -0.3, 0.3, 0.35);
  neckGrad.addColorStop(0, coatLight);
  neckGrad.addColorStop(1, coat);
  ctx.fillStyle = neckGrad;
  ctx.beginPath();
  ctx.moveTo(-0.12, 0.16);
  ctx.bezierCurveTo(0.10, -0.12, 0.30, -0.38, 0.52, -0.56);
  ctx.bezierCurveTo(0.60, -0.62, 0.66, -0.60, 0.64, -0.50);
  ctx.bezierCurveTo(0.48, -0.26, 0.34, -0.02, 0.30, 0.20);
  ctx.bezierCurveTo(0.14, 0.30, -0.04, 0.28, -0.12, 0.16);
  ctx.closePath();
  ctx.fill();
  // 鬃毛 (沿頸背)
  ctx.fillStyle = maneColor;
  ctx.beginPath();
  ctx.moveTo(0.50, -0.60);
  ctx.bezierCurveTo(0.28, -0.40, 0.08, -0.16, -0.10, 0.02);
  ctx.bezierCurveTo(-0.02, -0.18, 0.16, -0.38, 0.34, -0.52);
  ctx.closePath();
  ctx.fill();
  // 頭
  ctx.fillStyle = coat;
  ctx.beginPath();
  ctx.moveTo(0.52 + neckStretch, -0.66);
  ctx.bezierCurveTo(0.78 + neckStretch, -0.60, 1.00 + neckStretch, -0.46, 1.10 + neckStretch, -0.34);
  ctx.bezierCurveTo(1.13 + neckStretch, -0.28, 1.10 + neckStretch, -0.22, 1.02 + neckStretch, -0.21);
  ctx.bezierCurveTo(0.84 + neckStretch, -0.20, 0.64 + neckStretch, -0.30, 0.54 + neckStretch, -0.44);
  ctx.closePath();
  ctx.fill();
  // 耳
  ctx.fillStyle = coatDark;
  ctx.beginPath();
  ctx.moveTo(0.52 + neckStretch, -0.64);
  ctx.lineTo(0.50 + neckStretch, -0.80);
  ctx.lineTo(0.62 + neckStretch, -0.68);
  ctx.closePath();
  ctx.fill();
  // 眼 + 鼻孔
  ctx.fillStyle = '#14100c';
  ctx.beginPath();
  ctx.arc(0.68 + neckStretch, -0.52, 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1.03 + neckStretch, -0.33, 0.032, 0.02, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 近側腳
  drawLeg(ctx, -0.60, 0.14, tHindNear, true, coat, 1);
  drawLeg(ctx, 0.56, 0.16, tForeNear, false, coat, 1);

  // 馬布 + 號碼
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(-0.30, -0.34);
  ctx.bezierCurveTo(-0.05, -0.40, 0.22, -0.40, 0.40, -0.32);
  ctx.lineTo(0.36, 0.06);
  ctx.bezierCurveTo(0.10, 0.12, -0.12, 0.12, -0.28, 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = o.silk;
  ctx.lineWidth = 0.035;
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.font = 'black 0.34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(o.cloth), 0.05, 0.06);
  // 鞍
  ctx.fillStyle = '#292524';
  ctx.beginPath();
  ctx.ellipse(0.05, -0.36, 0.17, 0.055, 0, 0, Math.PI * 2);
  ctx.fill();

  // 騎師 (伏身姿勢)
  const silk = o.silk;
  // 腿：白褲 + 黑靴
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineCap = 'round';
  ctx.lineWidth = 0.115;
  ctx.beginPath();
  ctx.moveTo(0.0, -0.44);
  ctx.lineTo(0.26, -0.26);
  ctx.stroke();
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 0.085;
  ctx.beginPath();
  ctx.moveTo(0.26, -0.26);
  ctx.lineTo(0.12, -0.02);
  ctx.stroke();
  // 身軀 (綵衣，前傾)
  ctx.strokeStyle = silk;
  ctx.lineWidth = 0.19;
  ctx.beginPath();
  ctx.moveTo(-0.02, -0.48);
  ctx.lineTo(0.38, -0.80);
  ctx.stroke();
  // 綵衣圖案
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 0.05;
  if (o.silkPattern === 1) {
    ctx.beginPath();
    ctx.moveTo(0.10, -0.60);
    ctx.lineTo(0.22, -0.50);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.22, -0.70);
    ctx.lineTo(0.34, -0.60);
    ctx.stroke();
  } else if (o.silkPattern === 2) {
    ctx.beginPath();
    ctx.arc(0.18, -0.64, 0.045, 0, Math.PI * 2);
    ctx.stroke();
  } else if (o.silkPattern === 3) {
    ctx.beginPath();
    ctx.moveTo(0.06, -0.70);
    ctx.lineTo(0.30, -0.58);
    ctx.stroke();
  }
  // 手臂 (綵衣袖) + 韁繩
  ctx.strokeStyle = silk;
  ctx.lineWidth = 0.075;
  ctx.beginPath();
  ctx.moveTo(0.36, -0.78);
  ctx.lineTo(0.72, -0.60);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(28, 25, 23, 0.8)';
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(0.72, -0.60);
  ctx.lineTo(1.16, -0.50);
  ctx.stroke();
  // 頭 + 帽
  ctx.fillStyle = '#e8b98a';
  ctx.beginPath();
  ctx.arc(0.47, -0.86, 0.105, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = silk;
  ctx.beginPath();
  ctx.arc(0.47, -0.885, 0.11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(0.47, -0.90, 0.17, 0.035);

  ctx.restore();
  ctx.restore();
}

/** 由已跑距離推算奔跑相位 (步長隨速度增長)，倒帶/暫停都一致 */
export function gallopPhase(distance: number, speed: number): number {
  const strideLength = 5.6 + Math.max(0, speed) * 0.11;
  return (distance / strideLength) * Math.PI * 2;
}
