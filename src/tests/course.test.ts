import { describe, expect, it } from 'vitest';
import { buildRacePath } from '../engine/courseGeometry';
import { drawCourseView } from '../engine/courseRenderer';
import type { HorseSimulationState } from '../types/race';

describe('Winning Post HK course geometry upgrade', () => {
  it('TEST 27: 彎位數符合真實賽道 (1200米一彎、1800米兩彎)', () => {
    expect(buildRacePath('shatin', 1200).bendCount).toBe(1);
    expect(buildRacePath('shatin', 1400).bendCount).toBe(1);
    expect(buildRacePath('shatin', 1800).bendCount).toBe(2);
    expect(buildRacePath('shatin', 2000).bendCount).toBe(2);
    expect(buildRacePath('happy_valley', 1000).bendCount).toBe(1);
    expect(buildRacePath('happy_valley', 1650).bendCount).toBe(2);
    const st1000 = buildRacePath('shatin', 1000);
    expect(st1000.isStraightCourse).toBe(true);
    expect(st1000.bendCount).toBe(0);
  });

  it('TEST 28: 賽道走線端點正確且沿途連續 (無跳躍)', () => {
    const path = buildRacePath('shatin', 1600);
    const start = path.pointAtRace(0);
    const finish = path.pointAtRace(1600);
    expect(Math.hypot(start.x - path.startPoint.x, start.y - path.startPoint.y)).toBeLessThan(0.01);
    expect(Math.hypot(finish.x - path.finishPoint.x, finish.y - path.finishPoint.y)).toBeLessThan(0.01);
    let prev = path.pointAtRace(0);
    for (let d = 25; d <= 1600; d += 25) {
      const cur = path.pointAtRace(d);
      expect(Math.hypot(cur.x - prev.x, cur.y - prev.y)).toBeLessThan(30);
      prev = cur;
    }
  });

  it('TEST 29: 1200米走線經過對面直路同左彎，1800米再加右彎', () => {
    const p1200 = buildRacePath('shatin', 1200);
    let minY = Infinity;
    let minX = Infinity;
    for (let d = 0; d <= 1200; d += 10) {
      const p = p1200.pointAtRace(d);
      minY = Math.min(minY, p.y);
      minX = Math.min(minX, p.x);
    }
    expect(minY).toBeLessThan(115); // 到達對面直路 (頂部 y=105)
    expect(minX).toBeLessThan(230); // 進入左彎 (最左 x=195)

    const p1800 = buildRacePath('shatin', 1800);
    let maxX = -Infinity;
    for (let d = 0; d <= 1800; d += 10) {
      maxX = Math.max(maxX, p1800.pointAtRace(d).x);
    }
    expect(maxX).toBeGreaterThan(930); // 進入右彎 (最右 x=965)
  });

  it('TEST 30: 賽道全景渲染器在沙田/跑馬地/直路賽都不拋錯', () => {
    const grad = { addColorStop: () => {} };
    const fakeCtx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad;
          if (prop === 'measureText') return () => ({ width: 42 });
          if (typeof prop === 'string') return () => {};
          return undefined;
        },
        set: () => true,
      }
    ) as unknown as CanvasRenderingContext2D;

    const mkHorse = (i: number): HorseSimulationState =>
      ({
        horseId: `h${i}`,
        horseNameZh: `測試馬${i}`,
        horseNameEn: `Test ${i}`,
        gate: i + 1,
        jockeyNameZh: '潘頓',
        silkColor: '#dc2626',
        
        currentDistance: 300 + i * 40,
        currentSpeed: 16,
        currentEnergy: 80,
        lane: i % 5,
        rank: i + 1,
        isBlocked: false,
        isSprinting: i === 0,
        morale: 70,
        fitness: 90,
      }) as unknown as HorseSimulationState;

    const horses = Array.from({ length: 8 }, (_, i) => mkHorse(i));
    for (const [venue, dist] of [
      ['shatin', 1200],
      ['shatin', 1000],
      ['happy_valley', 1800],
    ] as const) {
      expect(() =>
        drawCourseView(fakeCtx, {
          width: 960,
          height: 400,
          path: buildRacePath(venue, dist),
          horses,
          totalDist: dist,
          isDirt: false,
          isNight: venue === 'happy_valley',
          venueNameZh: venue === 'happy_valley' ? '跑馬地' : '沙田',
          playerHorseIds: new Set(['h0']),
          selectedHorseId: 'h1',
          focusPoint: null,
        })
      ).not.toThrow();
    }
  });
it('TEST 31: 14 匹馬逼埋同一位置，圓球標記 + 避疊名牌渲染不拋錯', () => {
    const grad = { addColorStop: () => {} };
    const fakeCtx = new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => grad;
          if (prop === 'measureText') return () => ({ width: 42 });
          if (typeof prop === 'string') return () => {};
          return undefined;
        },
        set: () => true,
      }
    ) as unknown as CanvasRenderingContext2D;
    const horses = Array.from({ length: 14 }, (_, i) =>
      ({
        horseId: `b${i}`,
        horseNameZh: `逼埋馬${i}`,
        horseNameEn: `Bunched ${i}`,
        gate: i + 1,
        numberCloth: i + 1,
        jockeyNameZh: '潘頓',
        silkColor: i % 2 ? '#facc15' : '#dc2626',
                currentDistance: 500 + i * 2, // 幾乎疊在一起
        currentSpeed: 16,
        currentEnergy: 80,
        lane: i % 5,
        rank: i + 1,
        isBlocked: false,
        isSprinting: false,
        morale: 70,
        fitness: 90,
      }) as unknown as HorseSimulationState
    );
    expect(() =>
      drawCourseView(fakeCtx, {
        width: 960,
        height: 400,
        path: buildRacePath('shatin', 1800),
        horses,
        totalDist: 1800,
        isDirt: false,
        isNight: false,
        venueNameZh: '沙田',
        playerHorseIds: new Set(['b0']),
        selectedHorseId: 'b3',
        focusPoint: { x: 500, y: 300 },
      })
    ).not.toThrow();
  });
});
