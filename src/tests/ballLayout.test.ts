import { describe, expect, it } from 'vitest';
import { simulateRace } from '../engine/racingEngine';
import { HK_RACES_CALENDAR } from '../data/hkRaces';
import { INITIAL_HORSES } from '../data/hkHorses';
import { HK_JOCKEYS } from '../data/hkPeople';
import { generateEntriesForRace } from '../engine/aiEngine';
import { buildRacePath, venueFromCourseName } from '../engine/courseGeometry';
import { ballSpacingIndex, computeBallTrack, trueBallPoint, type BallPositions } from '../engine/ballLayout';
import { drawCourseView } from '../engine/courseRenderer';

const runRace = (raceIdx: number, seed: number) => {
  const race = HK_RACES_CALENDAR[raceIdx];
  const horseMap = new Map(INITIAL_HORSES.map((h) => [h.id, h]));
  const jockeyMap = new Map(HK_JOCKEYS.map((j) => [j.id, j]));
  const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
  const res = simulateRace(race, entries, horseMap, jockeyMap, seed);
  const path = buildRacePath(venueFromCourseName(res.courseNameZh), race.distance);
  return { res, path, totalDist: race.distance };
};

const fakeCtx = (() => {
  const grad = { addColorStop: () => {} };
  return new Proxy(
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
})();

describe('全景圓球穩定性 (Ball layout stability)', () => {
  it('TEST F1: 整場波位只取決於幀序 — 重計 (重播) 結果完全一樣', () => {
    const { res, path, totalDist } = runRace(0, 777);
    const a = computeBallTrack(path, res.replayFrames, totalDist);
    const b = computeBallTrack(path, res.replayFrames, totalDist);
    expect(b).toEqual(a);
  });

  it('TEST F2: 同一幀重畫、跳去任何一幀 (拉 bar / 轉鏡頭返嚟) 都係同一個位置', () => {
    const { res, path, totalDist } = runRace(5, 999);
    const track = computeBallTrack(path, res.replayFrames, totalDist);
    const draw = (i: number) => {
      let got: BallPositions | null = null;
      drawCourseView(fakeCtx, {
        width: 1440,
        height: 600,
        path,
        horses: res.replayFrames[i].horses,
        totalDist,
        isDirt: false,
        isNight: false,
        venueNameZh: res.courseNameZh,
        playerHorseIds: new Set(),
        selectedHorseId: null,
        fm: true,
        ballPositions: track[i],
        onPositions: (p) => (got = p),
      });
      return got!;
    };
    const mid = Math.floor(res.replayFrames.length / 2);
    const first = draw(mid);
    draw(res.replayFrames.length - 1); // 拉去尾
    draw(3); // 拉返頭
    expect(draw(mid)).toEqual(first);
    expect(draw(mid)).toEqual(track[mid]);
  });

  for (const [raceIdx, seed] of [
    [0, 1],
    [0, 777],
    [5, 13579],
    [12, 4242],
    [20, 8],
  ] as const) {
    it(`TEST F3 (race ${raceIdx} seed ${seed}): 順住播逐幀唔跳、唔倒退、間距夠、唔離馬太遠`, () => {
      const { res, path, totalDist } = runRace(raceIdx, seed);
      const track = computeBallTrack(path, res.replayFrames, totalDist);
      const jumps: number[] = [];
      const spacing: number[] = [];
      let backwards = 0;
      let moves = 0;
      let maxDisp = 0;
      res.replayFrames.forEach((f, i) => {
        spacing.push(ballSpacingIndex(f.horses, totalDist, track[i]));
        for (const h of f.horses) {
          const t = trueBallPoint(path, h);
          const d = track[i].get(h.horseId)!;
          maxDisp = Math.max(maxDisp, Math.hypot(d.x - t.x, d.y - t.y));
          if (i === 0) continue;
          const pf = res.replayFrames[i - 1].horses.find((x) => x.horseId === h.horseId)!;
          const pt = trueBallPoint(path, pf);
          const pd = track[i - 1].get(h.horseId)!;
          // 偏移 (顯示 − 真位置) 逐幀變化 = 肉眼見到嘅「跳」
          jumps.push(Math.hypot(d.x - t.x - (pd.x - pt.x), d.y - t.y - (pd.y - pt.y)));
          const along = (d.x - pd.x) * Math.cos(t.angle) + (d.y - pd.y) * Math.sin(t.angle);
          moves++;
          if (along < -1 && h.currentDistance < totalDist) backwards++;
        }
      });
      jumps.sort((a, b) => a - b);
      spacing.sort((a, b) => a - b);
      const p99 = jumps[Math.floor(jumps.length * 0.99)];
      // 舊版 (v2026.6.10) 實測: p99 33-43、最大 44-84、倒退 4-8%、離馬最遠 250-305
      expect(p99).toBeLessThan(12);
      expect(jumps[jumps.length - 1]).toBeLessThan(35);
      expect(backwards / moves).toBeLessThan(0.03);
      expect(maxDisp).toBeLessThan(170);
      expect(spacing[Math.floor(spacing.length / 2)]).toBeGreaterThan(0.9);
      expect(spacing[Math.floor(spacing.length * 0.05)]).toBeGreaterThan(0.7);
    });
  }

  it('TEST F5: 過咗終點嘅波繼續向前滑行慢慢停，唔會企喺終點線疊埋', () => {
    for (const [raceIdx, seed] of [
      [0, 777],
      [5, 13579],
      [20, 8],
    ] as const) {
      const { res, path, totalDist } = runRace(raceIdx, seed);
      const track = computeBallTrack(path, res.replayFrames, totalDist);
      const fin = path.pointAtRace(totalDist);
      const T = { x: Math.cos(fin.angle), y: Math.sin(fin.angle) };
      // 過終點沿跑道嘅弧長 (終點後可能入彎，唔可以用直線投影)
      const after = Array.from({ length: 301 }, (_, u) => ({
        u,
        p: path.isStraightCourse
          ? { x: fin.x + T.x * u, y: fin.y + T.y * u }
          : path.pointAtLoop(path.startS + totalDist + u),
      }));
      const past = (p: { x: number; y: number }) => {
        const straight = (p.x - fin.x) * T.x + (p.y - fin.y) * T.y;
        if (straight <= 0) return straight;
        let best = after[0];
        let bd = Infinity;
        for (const a of after) {
          const d = Math.hypot(a.p.x - p.x, a.p.y - p.y);
          if (d < bd) {
            bd = d;
            best = a;
          }
        }
        return best.u;
      };
      const last = res.replayFrames.length - 1;
      const winnerId = res.placings[0].horseId;
      // 冠軍衝線後過咗幾秒，波要明顯過咗終點
      expect(past(track[last].get(winnerId)!)).toBeGreaterThan(20);
      // 過線後每幀唔倒退 (直路段量)
      for (let i = 1; i <= last; i++) {
        for (const h of res.replayFrames[i - 1].horses) {
          if (h.currentDistance < totalDist) continue;
          const a = past(track[i - 1].get(h.horseId)!);
          const b = past(track[i].get(h.horseId)!);
          if (a > 0 && a < 120) expect(b).toBeGreaterThan(a - 1);
        }
      }
      // 最後一幀: 已過線嘅波按名次由前至後 (沿跑向)，冇兩粒疊喺同一點
      const order = res.placings.map((p) => p.horseId).filter((id) => track[last].has(id));
      const pts = order.map((id) => track[last].get(id)!);
      for (let a = 0; a < pts.length; a++)
        for (let b = a + 1; b < pts.length; b++)
          expect(Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y)).toBeGreaterThan(8);
      // 並排 (唔同疊位) 容許前後差少少，但第二名唔可以明顯拋離冠軍
      expect(past(pts[0])).toBeGreaterThan(past(pts[1]) - 5);
    }
  });

  it('TEST F4: 整場預計夠快 (唔會令開跑卡住)', () => {
    const { res, path, totalDist } = runRace(20, 8);
    const t0 = performance.now();
    computeBallTrack(path, res.replayFrames, totalDist);
    expect(performance.now() - t0).toBeLessThan(1500);
  });
});
