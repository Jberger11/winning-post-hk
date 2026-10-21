// 報名前預測：用同一套陣容生成 + 物理模擬，以固定種子試跑幾次，攞平均名次同主要對手。
// 唔寫入任何遊戲狀態 (馬匹深拷貝)。
import { GameState } from '../types/game';
import { Horse, RunningStyle } from '../types/horse';
import { RaceDefinition, RaceEntry } from '../types/race';
import { generateEntriesForRace, getGateDrawOrder } from './aiEngine';
import { simulateRace } from './racingEngine';

export interface RaceForecastRival {
  horseId: string;
  nameZh: string;
  rating: number;
  winPct: number;
  avgPlacing: number;
}

export interface RaceForecast {
  fieldSize: number;
  avgPlacing: number;
  bestPlacing: number;
  worstPlacing: number;
  winPct: number;
  top3Pct: number;
  rivals: RaceForecastRival[];
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function forecastRace(
  state: GameState,
  race: RaceDefinition,
  horseId: string,
  jockeyId: string,
  tactic: RunningStyle,
  runs = 10
): RaceForecast | null {
  const horse = state.horses.find((h) => h.id === horseId);
  const jockey = state.jockeys.find((j) => j.id === jockeyId) || state.jockeys[0];
  if (!horse || !jockey) return null;

  const horseMap = new Map<string, Horse>(state.horses.map((h) => [h.id, clone(h)]));
  horseMap.get(horseId)!.runningStyle = tactic;
  const jockeyMap = new Map(state.jockeys.map((j) => [j.id, j]));

  const otherPlayerIds = (state.activeRaceEntries[race.id] || []).filter((id) => id !== horseId);
  const playerIds = [horseId, ...otherPlayerIds];
  const gates = getGateDrawOrder(race);
  const playerEntries: RaceEntry[] = playerIds
    .map((id, idx) => {
      const h = horseMap.get(id);
      if (!h) return null;
      const jid = id === horseId ? jockey.id : state.activeEntryJockeys?.[race.id]?.[id] || jockey.id;
      const j = jockeyMap.get(jid) || jockey;
      return {
        horseId: h.id,
        horseNameZh: h.nameZh,
        jockeyId: j.id,
        jockeyNameZh: j.nameZh,
        trainerNameZh: h.trainerName,
        tactic: h.runningStyle,
        gate: gates[idx % gates.length],
        handicapWeight: 126,
        silkColor: '#C5A059',
        numberCloth: idx + 1,
        currentOdds: 10,
      } as RaceEntry;
    })
    .filter((e): e is RaceEntry => !!e);

  const usedToday = new Set<string>();
  for (const id of state.completedRaceIdsForWeek || []) {
    state.weeklyResults?.[id]?.placings?.forEach((p) => usedToday.add(p.horseId));
  }
  for (const [rId, ids] of Object.entries(state.activeRaceEntries || {})) {
    if (rId !== race.id) ids.forEach((id) => usedToday.add(id));
  }

  const field = generateEntriesForRace(race, state.horses, state.jockeys, playerEntries, usedToday, horseMap);
  const placingsById = new Map<string, number[]>();
  for (let i = 0; i < runs; i++) {
    const res = simulateRace(race, field, horseMap, jockeyMap, 0x5eed + i * 7919);
    for (const p of res.placings) {
      const arr = placingsById.get(p.horseId) ?? [];
      arr.push(p.placing);
      placingsById.set(p.horseId, arr);
    }
  }

  const mine = placingsById.get(horseId) ?? [];
  if (mine.length === 0) return null;
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  const pct = (a: number[], f: (x: number) => boolean) => Math.round((a.filter(f).length / a.length) * 100);

  const rivals = field
    .filter((e) => !playerIds.includes(e.horseId))
    .map((e) => {
      const ps = placingsById.get(e.horseId) ?? [];
      const h = horseMap.get(e.horseId);
      return {
        horseId: e.horseId,
        nameZh: e.horseNameZh,
        rating: h?.rating ?? 0,
        winPct: ps.length ? pct(ps, (x) => x === 1) : 0,
        avgPlacing: ps.length ? avg(ps) : field.length,
      };
    })
    .sort((a, b) => a.avgPlacing - b.avgPlacing)
    .slice(0, 3);

  return {
    fieldSize: field.length,
    avgPlacing: avg(mine),
    bestPlacing: Math.min(...mine),
    worstPlacing: Math.max(...mine),
    winPct: pct(mine, (x) => x === 1),
    top3Pct: pct(mine, (x) => x <= 3),
    rivals,
  };
}
