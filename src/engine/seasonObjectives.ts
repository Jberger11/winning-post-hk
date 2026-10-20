// ==========================================
// 賽季目標系統 (Season Objectives)
// 給馬房明確的中短期目標: 進度由現有遊戲狀態即時計算，
// 完成後可領取獎勵 (資金 + 聲望)，領取記錄寫入 claimedObjectiveIds。
// 基線注意: 玩家初始 3 匹馬本身已有戰績 (4 勝 / 累積獎金 HK$4.3M / 最高評分 74)，
// 所以目標門檻全部設在基線之上，確保每個目標都要真正打出來。
// ==========================================

import type { GameState } from '../types/game';

export interface SeasonObjectiveDef {
  id: string;
  titleZh: string;
  descZh: string;
  target: number;
  rewardFundsHKD: number;
  rewardReputation: number;
  metric: (state: GameState) => number;
  formatValue: (v: number) => string;
}

export interface SeasonObjectiveProgress {
  def: SeasonObjectiveDef;
  current: number;
  target: number;
  ratio: number; // 0..1
  complete: boolean;
  claimed: boolean;
}

const playerHorses = (state: GameState) => state.horses.filter(h => h.isPlayerOwned);
const activePlayerHorses = (state: GameState) => playerHorses(state).filter(h => !h.isRetired);

export const SEASON_OBJECTIVES: SeasonObjectiveDef[] = [
  {
    id: 'obj_next_win',
    titleZh: '再下一城',
    descZh: '旗下賽駒累積贏出 5 場頭馬 (開局已有 4 場)',
    target: 5,
    rewardFundsHKD: 300000,
    rewardReputation: 3,
    metric: s => playerHorses(s).reduce((sum, h) => sum + (h.wins || 0), 0),
    formatValue: v => `${v} 勝`,
  },
  {
    id: 'obj_wins_10',
    titleZh: '十勝馬房',
    descZh: '旗下賽駒累積贏出 10 場頭馬',
    target: 10,
    rewardFundsHKD: 800000,
    rewardReputation: 5,
    metric: s => playerHorses(s).reduce((sum, h) => sum + (h.wins || 0), 0),
    formatValue: v => `${v} 勝`,
  },
  {
    id: 'obj_prize_8m',
    titleZh: '獎金里程碑',
    descZh: '旗下賽駒累積總獎金達 HK$8,000,000 (開局 HK$4.3M)',
    target: 8000000,
    rewardFundsHKD: 500000,
    rewardReputation: 4,
    metric: s => playerHorses(s).reduce((sum, h) => sum + (h.totalPrizeMoney || 0), 0),
    formatValue: v => `HK$${Math.round(v).toLocaleString()}`,
  },
  {
    id: 'obj_g1_first',
    titleZh: '一級賽零的突破',
    descZh: '贏出第一場國際一級賽 (G1) 或四歲經典系列賽事',
    target: 1,
    rewardFundsHKD: 1500000,
    rewardReputation: 10,
    metric: s =>
      playerHorses(s).reduce(
        (count, h) =>
          count +
          (h.raceHistory || []).filter(
            r => r.placing === 1 && (r.raceClass === 'G1' || r.raceClass === 'CLASSIC_4YO')
          ).length,
        0
      ),
    formatValue: v => `${v} 場`,
  },
  {
    id: 'obj_stable_5',
    titleZh: '擴充兵力',
    descZh: '馬房現役賽駒達 5 匹 (買馬或繁育都計)',
    target: 5,
    rewardFundsHKD: 400000,
    rewardReputation: 3,
    metric: s => activePlayerHorses(s).length,
    formatValue: v => `${v} 匹`,
  },
  {
    id: 'obj_first_foal',
    titleZh: '自家繁育',
    descZh: '在配種中心繁育第一匹自家幼駒',
    target: 1,
    rewardFundsHKD: 600000,
    rewardReputation: 4,
    metric: s => playerHorses(s).filter(h => h.sireId && h.damId).length,
    formatValue: v => `${v} 匹`,
  },
  {
    id: 'obj_elite_90',
    titleZh: '精英班王牌',
    descZh: '任何一匹旗下賽駒評分達 90 分',
    target: 90,
    rewardFundsHKD: 700000,
    rewardReputation: 5,
    metric: s => playerHorses(s).reduce((max, h) => Math.max(max, h.rating || 0), 0),
    formatValue: v => `${v} 分`,
  },
  {
    id: 'obj_facility_3',
    titleZh: '基地升級',
    descZh: '任何一項設施升級至 Lv.3',
    target: 3,
    rewardFundsHKD: 500000,
    rewardReputation: 4,
    metric: s => s.facilities.reduce((max, f) => Math.max(max, f.level || 0), 0),
    formatValue: v => `Lv.${v}`,
  },
];

export function getObjectiveProgress(state: GameState): SeasonObjectiveProgress[] {
  const claimed = new Set(state.claimedObjectiveIds || []);
  return SEASON_OBJECTIVES.map(def => {
    const current = Math.max(0, def.metric(state));
    const complete = current >= def.target;
    return {
      def,
      current,
      target: def.target,
      ratio: Math.min(1, def.target > 0 ? current / def.target : 0),
      complete,
      claimed: claimed.has(def.id),
    };
  });
}

export function getObjectiveById(id: string): SeasonObjectiveDef | undefined {
  return SEASON_OBJECTIVES.find(o => o.id === id);
}
