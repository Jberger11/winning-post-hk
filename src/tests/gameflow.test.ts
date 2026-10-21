import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react', () => ({
  useState: (init: unknown) => [init, () => {}],
  useEffect: () => {},
}));

import type { GameState } from '../types/game';
import type { RaceDefinition } from '../types/race';

type Store = typeof import('../engine/gameStore');

async function freshStore(saved?: Partial<GameState>): Promise<Store> {
  vi.resetModules();
  const mem = new Map<string, string>();
  if (saved) mem.set('WINNING_POST_10_HK_SAVE_V1', JSON.stringify(saved));
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    },
  });
  return import('../engine/gameStore');
}

/** 搵本周 n 場唔同賽事，各配一匹合資格嘅玩家馬 */
async function enterHorses(store: Store, n: number): Promise<{ race: RaceDefinition; horseId: string }[]> {
  const { isHorseEligibleForRace } = await import('../engine/aiEngine');
  const picks: { race: RaceDefinition; horseId: string }[] = [];
  for (const race of [...store.useGame().state.scheduledRaces].reverse()) {
    if (picks.length >= n) break;
    const s = store.useGame().state;
    const ctx = {
      activeRaceEntries: s.activeRaceEntries,
      completedRaceIdsForWeek: s.completedRaceIdsForWeek,
      weeklyResults: s.weeklyResults,
      currentWeek: s.currentCalendar.week,
      currentYear: s.currentCalendar.year,
      scheduledRaces: s.scheduledRaces,
    };
    const horse = s.horses.find(
      (h) =>
        h.isPlayerOwned &&
        !picks.some((p) => p.horseId === h.id) &&
        isHorseEligibleForRace(h, race, ctx).eligible
    );
    if (!horse) continue;
    const res = store.useGame().enterRace(race.id, horse.id, s.jockeys[0].id, 'stalker');
    if (res.success) picks.push({ race, horseId: horse.id });
  }
  return picks;
}

describe('賽馬日流程 / 每周結算', () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('G1: 推進下一周會自動快速跑晒未跑嘅報名，結算記錄賽果、獎金同疲勞', async () => {
    const store = await freshStore();
    const picks = await enterHorses(store, 1);
    expect(picks.length).toBe(1);
    const { race, horseId } = picks[0];
    const before = store.useGame().state;
    expect(store.useGame().pendingPlayerRaces.map((r) => r.id)).toEqual([race.id]);
    const historyBefore = before.horses.find((h) => h.id === horseId)!.raceHistory.length;

    store.useGame().advanceWeek();
    const after = store.useGame().state;

    const horse = after.horses.find((h) => h.id === horseId)!;
    expect(horse.raceHistory.length).toBe(historyBefore + 1);
    expect(after.currentCalendar.week).toBe(before.currentCalendar.week + 1);
    expect(store.useGame().pendingPlayerRaces).toEqual([]);

    const s = after.lastWeekSummary!;
    expect(s.week).toBe(before.currentCalendar.week);
    expect(s.races.length).toBe(1);
    expect(s.races[0].raceId).toBe(race.id);
    expect(s.races[0].autoRun).toBe(true);
    expect(s.races[0].placing).toBeGreaterThanOrEqual(1);
    expect(s.expensesHKD).toBeGreaterThan(0);
    const line = s.horses.find((h) => h.horseId === horseId)!;
    expect(line.fatigueAfter).toBe(horse.fatigue);
    expect(s.nextWeekRaceCount).toBe(after.scheduledRaces.length);
    expect(after.weeklyLogs.some((l) => l.includes('自動出賽'))).toBe(true);

    store.useGame().dismissWeekSummary();
    expect(store.useGame().state.lastWeekSummary).toBeNull();
  });

  it('G2: 開始賽馬日按場次順序逐場跑，跑完返 null', async () => {
    const store = await freshStore();
    const picks = await enterHorses(store, 2);
    expect(picks.length).toBe(2);
    const order = [...picks].sort((a, b) => (a.race.raceNumber || 0) - (b.race.raceNumber || 0));

    const first = store.useGame().runNextPlayerRace();
    expect(first?.id).toBe(order[0].race.id);
    expect(store.useGame().state.currentView).toBe('live_race');
    expect(store.useGame().state.currentSimulationResult?.raceId).toBe(order[0].race.id);

    const second = store.useGame().runNextPlayerRace();
    expect(second?.id).toBe(order[1].race.id);
    expect(store.useGame().runNextPlayerRace()).toBeNull();
    expect(store.useGame().state.completedRaceIdsForWeek).toEqual(
      expect.arrayContaining(order.map((p) => p.race.id))
    );
  });

  it('G3: 重開時停喺直播 (存檔冇動畫幀) 會返大本營', async () => {
    const store0 = await freshStore();
    const saved = { ...store0.useGame().state, currentView: 'live_race' as const };
    const store = await freshStore(saved);
    expect(store.useGame().state.currentView).toBe('dashboard');
  });

  it('G4: 賽前預測唔改遊戲狀態、結果穩定、數字合理', async () => {
    const store = await freshStore();
    const { forecastRace } = await import('../engine/raceForecast');
    const { isHorseEligibleForRace } = await import('../engine/aiEngine');
    const s = store.useGame().state;
    let target: { race: RaceDefinition; horseId: string } | null = null;
    for (const race of s.scheduledRaces) {
      const h = s.horses.find((x) => x.isPlayerOwned && isHorseEligibleForRace(x, race).eligible);
      if (h) { target = { race, horseId: h.id }; break; }
    }
    expect(target).not.toBeNull();
    const snapshot = JSON.stringify(s);
    const f1 = forecastRace(s, target!.race, target!.horseId, s.jockeys[0].id, 'stalker')!;
    const f2 = forecastRace(s, target!.race, target!.horseId, s.jockeys[0].id, 'stalker')!;
    expect(JSON.stringify(store.useGame().state)).toBe(snapshot);
    expect(f1).toEqual(f2);
    expect(f1.avgPlacing).toBeGreaterThanOrEqual(1);
    expect(f1.avgPlacing).toBeLessThanOrEqual(f1.fieldSize);
    expect(f1.top3Pct).toBeGreaterThanOrEqual(f1.winPct);
    expect(f1.rivals.length).toBeGreaterThan(0);
    expect(f1.rivals.some((r) => r.horseId === target!.horseId)).toBe(false);
  });
});
