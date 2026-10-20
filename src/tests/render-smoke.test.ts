import { describe, it, expect } from 'vitest';
import { drawSideGallopingHorse, drawHeadOnFinishCam, drawTacticalDroneCam, ParticleSystem } from '../engine/raceCanvasRenderer';
import type { HorseSimulationState } from '../types/race';

// 以 Proxy 製造一個乜 method 都食嘅假 Canvas ctx，專捉 renderer 的 runtime 錯誤
function fakeCtx(): any {
  const grad = { addColorStop: () => {} };
  const target: any = {
    canvas: { width: 960, height: 400 },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: () => ({ width: 40 }),
  };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      return () => {};
    },
    set(obj, prop, value) { obj[prop] = value; return true; },
  });
}

const horse: HorseSimulationState = {
  horseId: 'h1', horseNameZh: '測試駒', gate: 3, numberCloth: 5, silkColor: '#dc2626',
  currentDistance: 500, lane: 1, currentSpeed: 16.5, currentEnergy: 55,
  isSprinting: true, isBlocked: false, tactic: 'stalker', rank: 1,
};
const horse2: HorseSimulationState = { ...horse, horseId: 'h2', horseNameZh: '二號駒', numberCloth: 2, currentDistance: 480, lane: 3, rank: 2, isBlocked: true };

describe('Renderer smoke', () => {
  it('TEST R1: 三種鏡頭 + 側面馬匹渲染無 runtime 錯誤', () => {
    const ctx = fakeCtx();
    const ps = new ParticleSystem();
    expect(() => drawSideGallopingHorse(ctx, horse, 200, 150, 1.2, true, true, false, 1.3, ps, false)).not.toThrow();
    expect(() => drawSideGallopingHorse(ctx, horse2, 300, 200, 1.0, false, false, true, 2.1, ps, true)).not.toThrow();
    expect(() => drawHeadOnFinishCam(ctx, 960, 400, [horse, horse2], 1200, false, new Set(['h1']))).not.toThrow();
    expect(() => drawTacticalDroneCam(ctx, 960, 400, [horse, horse2], 1200, false, new Set(['h1']), 'h2')).not.toThrow();
    expect(() => ps.updateAndDraw(ctx)).not.toThrow();
  });
});

import { buildHorseModel3D } from '../engine/horseModel3d';

describe('3D horse model', () => {
  it('TEST R2: 3D 賽駒模型建立 + 全相位擺姿勢無錯誤，關節旋轉為有限值', () => {
    const m = buildHorseModel3D({ coat: '#78350f', silk: '#dc2626', silkPattern: 0, cloth: 12 });
    expect(m.group.children.length).toBeGreaterThan(0);
    let meshCount = 0;
    m.group.traverse((o) => { if ((o as any).isMesh) meshCount++; });
    expect(meshCount).toBeGreaterThan(20);
    for (let p = 0; p < Math.PI * 2; p += 0.35) {
      expect(() => m.pose(p, p > 4)).not.toThrow();
    }
    m.group.traverse((o) => {
      expect(Number.isFinite(o.rotation.x)).toBe(true);
      expect(Number.isFinite(o.rotation.z)).toBe(true);
      expect(Number.isFinite(o.position.y)).toBe(true);
    });
  });
});
