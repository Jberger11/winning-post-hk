// ==========================================
// 遊戲核心狀態管理 (Game State Store)
// 支援即時狀態切換、自動存檔與持久化
// ==========================================

import { useState, useEffect } from 'react';
import { GameState, GameView } from '../types/game';
import { Horse } from '../types/horse';
import { RaceDefinition, RaceEntry, RaceSimulationResult } from '../types/race';
import { INITIAL_HORSES, LEGENDARY_STALLIONS } from '../data/hkHorses';
import { HK_RACES_CALENDAR } from '../data/hkRaces';
import { HK_JOCKEYS, HK_TRAINERS, INITIAL_OWNERS } from '../data/hkPeople';
import { INITIAL_FACILITIES } from '../data/hkFacilities';
import { advanceToNextWeek, getRacesForWeek } from './calendarEngine';
import { applyTraining, TrainingMenu } from './trainingEngine';
import { generateEntriesForRace, isHorseEligibleForRace, getGateDrawOrder, generateAICompetitor } from './aiEngine';
import { getObjectiveById, getObjectiveProgress } from './seasonObjectives';
import { simulateRace } from './racingEngine';
import { breedFoal } from './geneticsEngine';
import { FacilityType } from '../types/facility';
import {
  generateTacticalReview,
  TRACKWORK_CHALLENGES,
  evaluateTrackworkChallenge,
  HK_RACING_EVENTS,
  generateSeasonCeremony,
} from './gameplayUpgradeEngine';

const SAVE_KEY = 'WINNING_POST_10_HK_SAVE_V1';

export function createInitialState(): GameState {
  const initialRaces = getRacesForWeek(1);

  return {
    version: '2026.4.1',
    saveName: '沙田傳奇第一季',
    playerStableName: '傲翔馬房',
    playerFundsHKD: 25000000, // 起步資金 HK$25,000,000
    currentCalendar: {
      year: 2026,
      season: '2026/2027 馬季',
      week: 1,
      isRaceWeekend: true,
      meetingLocation: 'shatin',
      meetingType: 'day',
    },
    currentView: 'dashboard',
    horses: [...INITIAL_HORSES, ...LEGENDARY_STALLIONS],
    jockeys: [...HK_JOCKEYS],
    trainers: [...HK_TRAINERS],
    owners: [...INITIAL_OWNERS],
    facilities: [...INITIAL_FACILITIES],
    transactions: [
      {
        id: 'tx_init_capital',
        year: 2026,
        week: 1,
        type: 'capital_injection',
        amountHKD: 25000000,
        descriptionZh: '傲翔馬房開季獲注資營運資本',
        timestamp: new Date().toISOString(),
      }
    ],
    scheduledRaces: initialRaces,
    activeRaceEntries: {},
    activeEntryJockeys: {},
    currentActiveRaceIndex: 0,
    currentSimulationResult: null,
    completedRaceIdsForWeek: [],
    weeklyResults: {},
    completedRacesHistory: [],
    hallOfFame: [
      {
        horseId: 'legend_silent_witness',
        nameZh: '精英大師',
        title: '香港短途傳奇・創十七連勝世界紀錄',
        yearInducted: 2005,
        stats: '出賽 29 次 18 冠，十項一級賽盟主',
      },
      {
        horseId: 'legend_golden_sixty',
        nameZh: '金鎗六十',
        title: '三屆香港馬王・十勝國際一級賽歷史殿堂',
        yearInducted: 2024,
        stats: '出賽 31 次 26 冠，累積總獎金逾 1.67 億港元',
      }
    ],
    weeklyLogs: [
      '🏇【2026/2027 馬季隆重開鑼】香港賽馬會沙田開鑼日即將登場！',
      '🌟 你的馬房擁有 3 匹潛力賽駒，請安排本周晨操試蹄考驗及報名出賽！',
    ],
    recentPlacings: [2, 1, 3],
    horseJockeyAffinity: {
      player_horse_1_jockey_zac_purton: 72,
      player_horse_1_jockey_vincent_ho: 78,
      player_horse_2_jockey_vincent_ho: 75,
    },
    activeEvent: null,
    seasonCeremony: null,
    careerMilestones: {},
    claimedObjectiveIds: [],
    trackworkTrialDoneWeek: {},
    stableReputation: 58,
  };
}

// 簡易單例監聽器
let globalState: GameState = (() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const rawParsed = JSON.parse(saved);
        // 存檔遷移: 以現版初始狀態補齊舊存檔欠缺的新欄位，避免舊檔升級後崩潰；
        // 已儲存的欄位一律優先，唔會覆蓋玩家進度。
        const defaults = createInitialState();
        const parsed = { ...defaults, ...rawParsed };
        parsed.currentCalendar = { ...defaults.currentCalendar, ...(rawParsed.currentCalendar || {}) };
        if (!parsed.horseJockeyAffinity || typeof parsed.horseJockeyAffinity !== 'object') parsed.horseJockeyAffinity = {};
        if (!parsed.careerMilestones || typeof parsed.careerMilestones !== 'object') parsed.careerMilestones = {};
        if (!Array.isArray(parsed.claimedObjectiveIds)) parsed.claimedObjectiveIds = [];
        if (!parsed.trackworkTrialDoneWeek || typeof parsed.trackworkTrialDoneWeek !== 'object') parsed.trackworkTrialDoneWeek = {};
        if (!Array.isArray(parsed.recentPlacings)) parsed.recentPlacings = [];
        if (typeof parsed.stableReputation !== 'number') parsed.stableReputation = 58;
        if (!('activeEvent' in parsed)) parsed.activeEvent = null;
        if (!('seasonCeremony' in parsed)) parsed.seasonCeremony = null;
        // 舊存檔的開季注資曾誤歸類為賽事獎金，遷移為 capital_injection
        if (Array.isArray(parsed.transactions)) {
          parsed.transactions = parsed.transactions.map((tx: any) =>
            tx && tx.id === 'tx_init_capital' ? { ...tx, type: 'capital_injection' } : tx
          );
        }
        if (!Array.isArray(parsed.completedRaceIdsForWeek)) parsed.completedRaceIdsForWeek = [];
        if (!parsed.weeklyResults || typeof parsed.weeklyResults !== 'object') parsed.weeklyResults = {};

        // 確保目前周次的 scheduledRaces 擁有完整 11 場 (沙田) 或 9 場 (快活谷) 賽事
        const currentWeek = parsed.currentCalendar?.week || 1;
        const fullWeekRaces = getRacesForWeek(currentWeek);
        if (!Array.isArray(parsed.scheduledRaces) || parsed.scheduledRaces.length < fullWeekRaces.length) {
          parsed.scheduledRaces = fullWeekRaces;
        }
        return parsed;
      } catch (e) {
        console.warn('載入存檔失敗，創建新檔', e);
      }
    }
  }
  return createInitialState();
})();

const listeners = new Set<(state: GameState) => void>();

function serializeStateForStorage(state: GameState): string {
  // 移除龐大的 replayFrames 畫布動畫幀（每場數百幀、幾萬個座標物件），避免觸發瀏覽器 LocalStorage 5MB QuotaExceededError
  const lightWeeklyResults: Record<string, RaceSimulationResult> = {};
  if (state.weeklyResults) {
    for (const [key, res] of Object.entries(state.weeklyResults)) {
      lightWeeklyResults[key] = {
        ...res,
        replayFrames: [],
      };
    }
  }

  const lightCompletedHistory = (state.completedRacesHistory || []).map(res => ({
    ...res,
    replayFrames: [],
  }));

  const lightCurrentSim = state.currentSimulationResult
    ? { ...state.currentSimulationResult, replayFrames: [] }
    : null;

  const lightState: GameState = {
    ...state,
    weeklyResults: lightWeeklyResults,
    completedRacesHistory: lightCompletedHistory,
    currentSimulationResult: lightCurrentSim,
  };

  return JSON.stringify(lightState);
}

function emitChange() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const serialized = serializeStateForStorage(globalState);
      window.localStorage.setItem(SAVE_KEY, serialized);
    } catch (e) {
      console.warn('LocalStorage save failed, quota exceeded or disabled:', e);
      // 配額不足時先嘗試寫入精簡存檔 (裁走舊賽事歷史與舊日誌)；
      // 絕對唔好刪除最後一份好存檔，玩家進度比一次寫入失敗重要。
      try {
        const trimmed: GameState = {
          ...globalState,
          completedRacesHistory: (globalState.completedRacesHistory || []).slice(0, 20),
          weeklyLogs: (globalState.weeklyLogs || []).slice(0, 60),
          transactions: (globalState.transactions || []).slice(0, 200),
        };
        window.localStorage.setItem(SAVE_KEY, serializeStateForStorage(trimmed));
      } catch (err) {
        console.warn('Trimmed save also failed; keeping previous saved game intact.', err);
      }
    }
  }

  // 確保無論 Storage 是否報錯，React 監聽器與組件狀態皆必定及時更新響應
  listeners.forEach(listener => {
    try {
      listener(globalState);
    } catch (err) {
      console.error('Error invoking game store listener:', err);
    }
  });
}

export function useGame() {
  const [state, setState] = useState<GameState>(globalState);

  useEffect(() => {
    const listener = (newState: GameState) => setState(newState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const setView = (view: GameView) => {
    globalState = { ...globalState, currentView: view };
    emitChange();
  };

  const trainHorseAction = (horseId: string, menu: TrainingMenu) => {
    const horse = globalState.horses.find(h => h.id === horseId);
    if (!horse) return;

    const trainer = globalState.trainers.find(t => t.id === horse.trainerId);
    const { log } = applyTraining(horse, menu, trainer, globalState.facilities);

    globalState = {
      ...globalState,
      horses: [...globalState.horses],
      weeklyLogs: [log, ...globalState.weeklyLogs],
    };
    emitChange();
  };

  const withdrawRaceEntryAction = (raceId: string, horseId: string) => {
    const existing = globalState.activeRaceEntries[raceId] || [];
    const horse = globalState.horses.find(h => h.id === horseId);
    const race = globalState.scheduledRaces.find(r => r.id === raceId) || HK_RACES_CALENDAR.find(r => r.id === raceId);

    globalState = {
      ...globalState,
      activeRaceEntries: {
        ...globalState.activeRaceEntries,
        [raceId]: existing.filter(id => id !== horseId),
      },
      weeklyLogs: [
        `🚫 已為賽駒【${horse?.nameZh || ''}】退出【${race?.nameZh || ''}】之出賽報名。`,
        ...globalState.weeklyLogs,
      ],
    };
    emitChange();
    return { success: true };
  };

  const enterRaceAction = (
    raceId: string,
    horseId: string,
    jockeyId: string,
    tactic: Horse['runningStyle'],
    transferFromRaceId?: string
  ) => {
    const race = globalState.scheduledRaces.find(r => r.id === raceId) || HK_RACES_CALENDAR.find(r => r.id === raceId);
    const horse = globalState.horses.find(h => h.id === horseId);
    const jockey = globalState.jockeys.find(j => j.id === jockeyId);
    if (!race || !horse || !jockey) return { success: false, reason: '賽事、馬匹或騎師不存在' };

    // 若玩家指定從原場次改投此場，先退出原場次
    if (transferFromRaceId && globalState.activeRaceEntries[transferFromRaceId]) {
      globalState.activeRaceEntries[transferFromRaceId] = globalState.activeRaceEntries[transferFromRaceId].filter(
        id => id !== horseId
      );
    }

    // 檢查同日出賽限制 (一馬一日限跑一場)
    const elig = isHorseEligibleForRace(horse, race, {
      activeRaceEntries: globalState.activeRaceEntries,
      completedRaceIdsForWeek: globalState.completedRaceIdsForWeek,
      weeklyResults: globalState.weeklyResults,
      currentWeek: globalState.currentCalendar.week,
      currentYear: globalState.currentCalendar.year,
      scheduledRaces: globalState.scheduledRaces,
    });
    if (!elig.eligible) {
      return { success: false, reason: elig.reason, alreadyEnteredRaceId: elig.alreadyEnteredRaceId };
    }

    // 同一場賽事，同一騎師不可分身策騎兩匹玩家馬 (TEST 03 的玩家版)
    const sameRaceJockeys = globalState.activeEntryJockeys?.[raceId] || {};
    const jockeyTakenBy = Object.entries(sameRaceJockeys).find(
      ([otherHorseId, jId]) => jId === jockeyId && otherHorseId !== horseId
    );
    if (jockeyTakenBy) {
      const otherHorse = globalState.horses.find(h => h.id === jockeyTakenBy[0]);
      return {
        success: false,
        reason: `騎師【${jockey.nameZh}】在本場已策騎【${otherHorse?.nameZh || '另一匹賽駒'}】，請另選騎師`,
      };
    }

    // 保證一馬一日限跑一場：清除該馬匹在所有其他未完賽場次中的舊報名
    for (const rId of Object.keys(globalState.activeRaceEntries)) {
      if (rId !== raceId) {
        globalState.activeRaceEntries[rId] = globalState.activeRaceEntries[rId].filter(id => id !== horseId);
      }
    }

    // 建立報名記錄
    const existing = globalState.activeRaceEntries[raceId] || [];
    if (!existing.includes(horseId)) {
      globalState.activeRaceEntries[raceId] = [...existing, horseId];
    }

    const entryJockeys = { ...(globalState.activeEntryJockeys || {}) };
    entryJockeys[raceId] = { ...(entryJockeys[raceId] || {}), [horseId]: jockeyId };

    // 儲存出賽策略
    horse.runningStyle = tactic;

    globalState = {
      ...globalState,
      activeRaceEntries: { ...globalState.activeRaceEntries },
      activeEntryJockeys: entryJockeys,
      weeklyLogs: [
        `📋 已成功為【${horse.nameZh}】報名角逐【${race.nameZh}】，配搭大師傅【${jockey.nameZh}】！`,
        ...globalState.weeklyLogs,
      ],
    };
    emitChange();
    return { success: true };
  };

  // 模擬整周賽事
  // applyResults=false 時只計算賽果供重播/預覽，唔會入賬獎金、唔會改戰績評分疲勞、唔會寫入歷史。
  // (舊版重播與臨場指令都會重新模擬並重複結算，㩒一次等於跑多一場。)
  const runRaceSimulation = (raceId: string, customSeed?: number, opts?: { applyResults?: boolean; entriesOverride?: RaceEntry[] }): RaceSimulationResult => {
    const applyResults = opts?.applyResults !== false;
    const race = globalState.scheduledRaces.find(r => r.id === raceId) || HK_RACES_CALENDAR.find(r => r.id === raceId)!;
    const playerEnteredHorseIds = globalState.activeRaceEntries[raceId] || [];

    const horseMap = new Map<string, Horse>(globalState.horses.map(h => [h.id, h]));
    const jockeyMap = new Map<string, typeof HK_JOCKEYS[0]>(globalState.jockeys.map(j => [j.id, j]));

    // 若玩家有報名馬匹，構造 Player Entries (v2026.3: 同場可多匹玩家馬出賽，
    // 舊版只跑第一匹，其餘報了名也消失)。檔位用本場種子抽籤次序，保證不重複兼可重現。
    let playerEntries: RaceEntry[] = [];
    let activePlayerHorse: Horse | undefined = undefined;
    let activePlayerJockey = globalState.jockeys[0];
    const gateDrawOrder = getGateDrawOrder(race);
    const silkPalette = ['#C5A059', '#dc2626', '#2563eb', '#059669', '#7c3aed', '#db2777'];

    playerEnteredHorseIds.forEach((horseId, idx) => {
      const playerHorse = horseMap.get(horseId);
      if (!playerHorse) return;
      const assignedJockeyId = globalState.activeEntryJockeys?.[raceId]?.[playerHorse.id];
      const jockey = globalState.jockeys.find(j => j.id === assignedJockeyId) || globalState.jockeys[0];
      if (idx === 0) {
        activePlayerHorse = playerHorse;
        activePlayerJockey = jockey;
      }
      playerEntries.push({
        horseId: playerHorse.id,
        horseNameZh: playerHorse.nameZh,
        jockeyId: jockey.id,
        jockeyNameZh: jockey.nameZh,
        trainerNameZh: playerHorse.trainerName,
        tactic: playerHorse.runningStyle,
        gate: gateDrawOrder[idx % gateDrawOrder.length],
        handicapWeight: 126,
        silkColor: silkPalette[idx % silkPalette.length],
        numberCloth: idx + 1,
        currentOdds: Math.max(1.8, Math.min(25.0, Math.round((120 - playerHorse.rating) * 0.9 * 10) / 10)),
      });
    });

    // 自動填充參賽馬匹 (包含 AI 對手)
    const todayUsedHorseIds = new Set<string>();
    (globalState.completedRaceIdsForWeek || []).forEach(compId => {
      const res = globalState.weeklyResults?.[compId];
      res?.placings?.forEach(p => todayUsedHorseIds.add(p.horseId));
    });
    Object.entries(globalState.activeRaceEntries || {}).forEach(([rId, hIds]) => {
      if (rId !== raceId) {
        hIds.forEach(id => todayUsedHorseIds.add(id));
      }
    });

    // 重播路徑: 用賽果保存的陣容快照重現原場 (對手、檔位、騎師、號布全部一致)，
    // 生成型 AI 對手按 slot 編號重新生成回 horseMap (屬性公式本身是確定性的)。
    let fieldEntries: RaceEntry[];
    if (opts?.entriesOverride && opts.entriesOverride.length > 0) {
      fieldEntries = opts.entriesOverride;
      for (const entry of fieldEntries) {
        if (!horseMap.has(entry.horseId) && entry.horseId.startsWith('ai_comp_')) {
          const slotMatch = entry.horseId.match(/_slot_(\d+)$/);
          if (slotMatch) {
            horseMap.set(entry.horseId, generateAICompetitor(race, parseInt(slotMatch[1], 10)));
          }
        }
        if (!jockeyMap.has(entry.jockeyId)) {
          const j = globalState.jockeys.find(x => x.id === entry.jockeyId);
          if (j) jockeyMap.set(j.id, j);
        }
      }
    } else {
      fieldEntries = generateEntriesForRace(
        race,
        globalState.horses,
        globalState.jockeys,
        playerEntries.length > 0 ? playerEntries : undefined,
        todayUsedHorseIds,
        horseMap
      );
    }

    // 執行物理模擬 (TEST 01: 確定性模擬)
    const seed = customSeed !== undefined ? customSeed : Date.now();
    const result = simulateRace(race, fieldEntries, horseMap, jockeyMap, seed);
    result.entries = fieldEntries; // 陣容快照，供重播原場重現

    // 若玩家有賽駒參賽，生成賽後詳細戰術檢討報告、更新手風與人馬合拍度
    const updatedAffinity = { ...(globalState.horseJockeyAffinity || {}) };
    let updatedRecentPlacings = [...(globalState.recentPlacings || [])];

    const reviewHorse: Horse | undefined =
      playerEntries.length > 0 ? horseMap.get(playerEntries[0].horseId) : undefined;
    if (reviewHorse) {
      const review = generateTacticalReview(
        race,
        result.placings,
        result.replayFrames,
        reviewHorse,
        activePlayerJockey
      );
      result.tacticalReview = review;

      if (applyResults) {
        const affKey = `${reviewHorse.id}_${activePlayerJockey.id}`;
        updatedAffinity[affKey] = Math.min(100, Math.max(0, (updatedAffinity[affKey] || 60) + review.compatibilityDelta));
        updatedRecentPlacings = [review.actualPlacing, ...updatedRecentPlacings].slice(0, 10);

        const tr = globalState.trainers.find(t => t.nameZh === reviewHorse.trainerName);
        if (tr) {
          tr.trust = Math.min(100, Math.max(0, (tr.trust || 65) + review.trustDelta));
        }
      }
    }

    if (!applyResults) {
      return result;
    }

    // 更新出賽馬匹戰績與評分
    let earnedPrizeHKD = 0;
    for (const placing of result.placings) {
      const h = horseMap.get(placing.horseId);
      if (!h) continue;

      h.careerStarts += 1;
      if (placing.placing === 1) h.wins += 1;
      else if (placing.placing === 2) h.seconds += 1;
      else if (placing.placing === 3) h.thirds += 1;

      h.totalPrizeMoney += placing.prizeMoneyHKD;
      h.rating = Math.max(10, Math.min(145, h.rating + placing.ratingChange));
      h.fatigue = Math.min(100, h.fatigue + 25);
      h.fitness = Math.max(60, h.fitness - 5);

      if (h.isPlayerOwned) {
        earnedPrizeHKD += placing.prizeMoneyHKD;
        if (placing.placing === 1 && race.trophyName) {
          h.trophies = [...h.trophies, race.trophyName];
        }
      }

      // 歷史記錄
      h.raceHistory.unshift({
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        raceName: race.nameZh,
        raceClass: race.grade,
        track: race.courseNameZh,
        distance: race.distance,
        placing: placing.placing,
        fieldSize: fieldEntries.length,
        jockeyName: placing.jockeyNameZh,
        weight: placing.weight,
        margin: placing.marginText,
        time: placing.finishTimeFormatted,
        prizeMoney: placing.prizeMoneyHKD,
        ratingChange: placing.ratingChange,
      });
    }

    // 玩家獎金入賬
    let updatedFunds = globalState.playerFundsHKD;
    const newTxs = [...globalState.transactions];
    if (earnedPrizeHKD > 0) {
      const ownerShare = Math.round(earnedPrizeHKD * 0.7);
      updatedFunds += ownerShare;
      newTxs.unshift({
        id: `tx_${Date.now()}_prize`,
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        type: 'prize_money',
        amountHKD: ownerShare,
        descriptionZh: `【${race.nameZh}】榮獲名次獎金分賬 (馬主 70% 份額)`,
        timestamp: new Date().toISOString(),
      });
    }

    const updatedCompletedIds = Array.from(new Set([...(globalState.completedRaceIdsForWeek || []), raceId]));
    const updatedWeeklyResults = {
      ...(globalState.weeklyResults || {}),
      [raceId]: result,
    };

    globalState = {
      ...globalState,
      playerFundsHKD: updatedFunds,
      horses: [...globalState.horses],
      trainers: [...globalState.trainers],
      transactions: newTxs,
      currentSimulationResult: result,
      completedRaceIdsForWeek: updatedCompletedIds,
      weeklyResults: updatedWeeklyResults,
      completedRacesHistory: [result, ...globalState.completedRacesHistory],
      horseJockeyAffinity: updatedAffinity,
      recentPlacings: updatedRecentPlacings,
    };
    emitChange();

    return result;
  };

  const advanceWeekAction = () => {
    globalState = advanceToNextWeek(globalState);
    emitChange();
  };

  const upgradeFacilityAction = (facilityId: FacilityType) => {
    const fac = globalState.facilities.find(f => f.id === facilityId);
    if (!fac || fac.level >= fac.maxLevel) return { success: false, reason: '已達最高等級' };
    if (globalState.playerFundsHKD < fac.costHKD) return { success: false, reason: '馬房資金不足' };

    const newFunds = globalState.playerFundsHKD - fac.costHKD;
    fac.level += 1;

    const newTxs = [
      {
        id: `tx_${Date.now()}_fac`,
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        type: 'facility_upgrade' as const,
        amountHKD: -fac.costHKD,
        descriptionZh: `升級設施【${fac.nameZh}】至 Lv ${fac.level}`,
        timestamp: new Date().toISOString(),
      },
      ...globalState.transactions,
    ];

    globalState = {
      ...globalState,
      playerFundsHKD: newFunds,
      facilities: [...globalState.facilities],
      transactions: newTxs,
      weeklyLogs: [`🏗️ 成功升級【${fac.nameZh}】至 Lv ${fac.level}！`, ...globalState.weeklyLogs],
    };
    emitChange();
    return { success: true };
  };

  const buyHorseAction = (horse: Horse, costHKD: number) => {
    if (globalState.playerFundsHKD < costHKD) return { success: false, reason: '資金不足' };

    // 防重複購入: 同 ID 或同名已進駐馬房就唔再扣錢
    const alreadyOwned = globalState.horses.some(
      h => h.id === horse.id || (h.isPlayerOwned && h.nameZh === horse.nameZh)
    );
    if (alreadyOwned) return { success: false, reason: '此駒已進駐馬房' };

    // 關鍵修正: 購入的馬必須真正加入 horses 名單。
    // 舊版只改了傳入物件的旗標再複製原名單，新馬從來無入過名單，
    // 結果扣了錢、出了成功訊息，隻馬卻消失，仲可以無限重複購入。
    const purchasedHorse: Horse = {
      ...horse,
      isPlayerOwned: true,
      ownerId: 'player',
      ownerName: globalState.playerStableName,
    };

    const newFunds = globalState.playerFundsHKD - costHKD;
    const newTxs = [
      {
        id: `tx_${Date.now()}_buy`,
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        type: 'horse_purchase' as const,
        amountHKD: -costHKD,
        descriptionZh: `於拍賣會成功購入賽駒【${horse.nameZh}】`,
        timestamp: new Date().toISOString(),
      },
      ...globalState.transactions,
    ];

    globalState = {
      ...globalState,
      playerFundsHKD: newFunds,
      horses: [...globalState.horses, purchasedHorse],
      transactions: newTxs,
      weeklyLogs: [`🎉 恭喜！你成功以 HK$${costHKD.toLocaleString()} 購入優質新星【${horse.nameZh}】！`, ...globalState.weeklyLogs],
    };
    emitChange();
    return { success: true };
  };

  const breedFoalAction = (stallionId: string, broodmareId: string, nameZh: string, nameEn: string) => {
    const stallion = globalState.horses.find(h => h.id === stallionId);
    const broodmare = globalState.horses.find(h => h.id === broodmareId);
    if (!stallion || !broodmare) return { success: false, reason: '父系或母系不存在' };

    const studFee = stallion.studFee || 100000;
    if (globalState.playerFundsHKD < studFee) return { success: false, reason: '配種費不足' };

    const foalNurseryLvl = globalState.facilities.find(f => f.id === 'foal_nursery')?.level || 0;
    const newFoal = breedFoal(
      stallion,
      broodmare,
      nameZh,
      nameEn,
      'player',
      globalState.playerStableName,
      foalNurseryLvl * 2
    );

    const newFunds = globalState.playerFundsHKD - studFee;
    const newTxs = [
      {
        id: `tx_${Date.now()}_breed`,
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        type: 'stud_fee' as const,
        amountHKD: -studFee,
        descriptionZh: `配種培育：【${stallion.nameZh}】×【${broodmare.nameZh}】支付配種費`,
        timestamp: new Date().toISOString(),
      },
      ...globalState.transactions,
    ];

    globalState = {
      ...globalState,
      playerFundsHKD: newFunds,
      horses: [newFoal, ...globalState.horses],
      transactions: newTxs,
      weeklyLogs: [`🍼 恭賀！新一代幼駒【${newFoal.nameZh}】誕生！承繼【${stallion.sireLine}】名門血脈！`, ...globalState.weeklyLogs],
    };
    emitChange();
    return { success: true, foal: newFoal };
  };

  // 領取賽季目標獎勵 (進度由 seasonObjectives 即時計算，這裡只負責驗證與入賬)
  const claimObjectiveRewardAction = (objectiveId: string) => {
    const def = getObjectiveById(objectiveId);
    if (!def) return { success: false, reason: '目標不存在' };
    if ((globalState.claimedObjectiveIds || []).includes(objectiveId)) {
      return { success: false, reason: '此目標獎勵已領取' };
    }
    const progress = getObjectiveProgress(globalState).find(p => p.def.id === objectiveId);
    if (!progress || !progress.complete) {
      return { success: false, reason: '目標尚未完成' };
    }

    const newTxs = [
      {
        id: `tx_${Date.now()}_objective`,
        year: globalState.currentCalendar.year,
        week: globalState.currentCalendar.week,
        type: 'objective_reward' as const,
        amountHKD: def.rewardFundsHKD,
        descriptionZh: `賽季目標達成【${def.titleZh}】獎勵`,
        timestamp: new Date().toISOString(),
      },
      ...globalState.transactions,
    ];

    globalState = {
      ...globalState,
      playerFundsHKD: globalState.playerFundsHKD + def.rewardFundsHKD,
      stableReputation: Math.min(100, (globalState.stableReputation || 58) + def.rewardReputation),
      claimedObjectiveIds: [...(globalState.claimedObjectiveIds || []), objectiveId],
      transactions: newTxs,
      weeklyLogs: [
        `🎯 賽季目標達成【${def.titleZh}】！領取獎勵 HK$${def.rewardFundsHKD.toLocaleString()}，馬房聲望 +${def.rewardReputation}！`,
        ...globalState.weeklyLogs,
      ],
    };
    emitChange();
    return { success: true };
  };

  const restartNewGame = () => {
    globalState = createInitialState();
    emitChange();
  };

  const exportSaveJson = () => {
    // 與自動存檔共用精簡序列化，剔走 replayFrames，避免導出 JSON 巨大到貼唔入導入框
    return serializeStateForStorage(globalState);
  };

  const importSaveJson = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr) as GameState;
      if (parsed.version && parsed.horses) {
        globalState = parsed;
        emitChange();
        return { success: true };
      }
      return { success: false, reason: '存檔格式不相符' };
    } catch (e: any) {
      return { success: false, reason: e.message };
    }
  };

  const viewRaceReplayAction = (result: RaceSimulationResult) => {
    let finalResult = result;
    if (!result.replayFrames || result.replayFrames.length === 0) {
      // 重播只重新生成畫面幀，禁止再次結算 (獎金/戰績/疲勞/評分)；
      // 有陣容快照就用快照重現原場，冇先退回舊行為重新生成。
      finalResult = runRaceSimulation(result.raceId, result.seed || 100, {
        applyResults: false,
        entriesOverride: result.entries,
      });
    }
    globalState = {
      ...globalState,
      currentSimulationResult: finalResult,
      currentView: 'live_race',
    };
    emitChange();
  };

  // 今日晨操試蹄考驗 (Interactive Trackwork Trial)
  const runTrackworkTrialAction = (horseId: string, challengeId: string, choiceId: string, jockeyId?: string) => {
    const horse = globalState.horses.find(h => h.id === horseId);
    const challenge = TRACKWORK_CHALLENGES.find(c => c.id === challengeId) || TRACKWORK_CHALLENGES[0];
    if (!horse) return null;

    const evalRes = evaluateTrackworkChallenge(challenge, choiceId, horse);
    const attr = evalRes.statBoostAttr;
    horse.attributes[attr] = Math.min(horse.geneticCeiling[attr], horse.attributes[attr] + evalRes.statBoostAmount);
    horse.fitness = Math.min(100, horse.fitness + 5);
    horse.fatigue = Math.min(100, horse.fatigue + 8);

    const targetJockeyId = jockeyId || globalState.jockeys[0].id;
    const affKey = `${horse.id}_${targetJockeyId}`;
    const updatedAffinity = { ...(globalState.horseJockeyAffinity || {}) };
    updatedAffinity[affKey] = Math.min(100, (updatedAffinity[affKey] || 60) + evalRes.compatibilityBonus);

    const updatedDone = { ...(globalState.trackworkTrialDoneWeek || {}) };
    updatedDone[horse.id] = globalState.currentCalendar.week;

    globalState = {
      ...globalState,
      horses: [...globalState.horses],
      horseJockeyAffinity: updatedAffinity,
      trackworkTrialDoneWeek: updatedDone,
      weeklyLogs: [evalRes.summaryZh, ...globalState.weeklyLogs],
    };
    emitChange();
    return evalRes;
  };

  // 處理馬圈突發事件抉擇
  const resolveEventChoiceAction = (choiceId: string) => {
    const evt = globalState.activeEvent;
    if (!evt) return;
    const choice = evt.choices.find(c => c.id === choiceId) || evt.choices[0];

    const updatedFunds = Math.max(0, globalState.playerFundsHKD + (choice.fundsDeltaHKD || 0));
    const updatedRep = Math.min(100, Math.max(0, (globalState.stableReputation || 58) + (choice.reputationDelta || 0)));

    if (choice.jockeyBondDelta) {
      globalState.jockeys.forEach(j => {
        j.bond = Math.min(100, Math.max(-100, (j.bond || 30) + choice.jockeyBondDelta!));
      });
    }
    if (choice.trainerTrustDelta) {
      globalState.trainers.forEach(t => {
        t.trust = Math.min(100, Math.max(0, (t.trust || 65) + choice.trainerTrustDelta!));
      });
    }
    if (choice.moraleDelta || choice.fitnessDelta || choice.fatigueDelta) {
      globalState.horses.forEach(h => {
        if (h.isPlayerOwned && !h.isRetired) {
          if (choice.moraleDelta) h.morale = Math.min(100, Math.max(0, h.morale + choice.moraleDelta));
          if (choice.fitnessDelta) h.fitness = Math.min(100, Math.max(0, h.fitness + choice.fitnessDelta));
          if (choice.fatigueDelta) h.fatigue = Math.min(100, Math.max(0, h.fatigue + choice.fatigueDelta));
        }
      });
    }

    globalState = {
      ...globalState,
      playerFundsHKD: updatedFunds,
      stableReputation: updatedRep,
      jockeys: [...globalState.jockeys],
      trainers: [...globalState.trainers],
      horses: [...globalState.horses],
      activeEvent: null,
      weeklyLogs: [`📰【${evt.title}】${choice.outcomeText}`, ...globalState.weeklyLogs],
    };
    emitChange();
  };

  const triggerManualEventAction = () => {
    const idx = Math.floor(Math.random() * HK_RACING_EVENTS.length);
    globalState = {
      ...globalState,
      activeEvent: HK_RACING_EVENTS[idx],
    };
    emitChange();
  };

  // 完成季末冠軍人馬獎頒獎禮致辭
  const completeSeasonCeremonyAction = (speechType: 'humble' | 'ambitious' | 'team') => {
    let logMsg = '🏆 你於香港冠軍人馬獎頒獎禮發表感言，全場掌聲雷動！';
    if (speechType === 'humble') {
      globalState.trainers.forEach(t => { t.trust = Math.min(100, (t.trust || 65) + 8); });
      logMsg = '🏆【頒獎禮致辭】你將榮耀歸功於練馬師與馬房團隊，全體練馬師信任度 +8！';
    } else if (speechType === 'ambitious') {
      globalState.stableReputation = Math.min(100, (globalState.stableReputation || 58) + 10);
      logMsg = '🏆【頒獎禮致辭】你誓言衛冕來季一級賽大滿貫，馬房業界聲望 +10！';
    } else {
      globalState.horses.forEach(h => {
        if (h.isPlayerOwned) h.morale = Math.min(100, h.morale + 10);
      });
      logMsg = '🏆【頒獎禮致辭】你感謝名下賽駒與騎師拼搏，全體賽駒士氣大振 (+10)！';
    }

    globalState = {
      ...globalState,
      seasonCeremony: null,
      trainers: [...globalState.trainers],
      horses: [...globalState.horses],
      weeklyLogs: [logMsg, ...globalState.weeklyLogs],
    };
    emitChange();
  };

  const triggerManualCeremonyAction = () => {
    globalState = {
      ...globalState,
      seasonCeremony: generateSeasonCeremony(globalState),
    };
    emitChange();
  };

  // 馬圈人脈社交行動
  const socializeWithPersonAction = (
    personType: 'jockey' | 'trainer',
    personId: string,
    costHKD: number,
    labelZh: string
  ) => {
    if (globalState.playerFundsHKD < costHKD) return { success: false, reason: '資金不足' };

    let targetName = '';
    if (personType === 'jockey') {
      const j = globalState.jockeys.find(x => x.id === personId);
      if (!j) return { success: false, reason: '找不到騎師' };
      j.bond = Math.min(100, (j.bond || 30) + 12);
      targetName = j.nameZh;
    } else {
      const t = globalState.trainers.find(x => x.id === personId);
      if (!t) return { success: false, reason: '找不到練馬師' };
      t.trust = Math.min(100, (t.trust || 65) + 10);
      t.personalBond = Math.min(100, (t.personalBond || 50) + 12);
      targetName = t.nameZh;
    }

    globalState = {
      ...globalState,
      playerFundsHKD: globalState.playerFundsHKD - costHKD,
      jockeys: [...globalState.jockeys],
      trainers: [...globalState.trainers],
      weeklyLogs: [`🥂 你邀請【${targetName}】出席「${labelZh}」，雙方交情與合作默契顯著提升！`, ...globalState.weeklyLogs],
    };
    emitChange();
    return { success: true };
  };

  // 臨場戰術指揮 (Pre-race / Live Tactical Command)
  const issueTacticalCommandAction = (
    raceId: string,
    horseId: string,
    newTactic: Horse['runningStyle'],
    commandLabelZh: string
  ) => {
    const horse = globalState.horses.find(h => h.id === horseId);
    if (!horse) return;
    horse.runningStyle = newTactic;
    // 修正: 賽事結果一經模擬即為確定性賽果，臨場指令唔應該成場重新模擬兼重複結算
    // (舊版每㩒一次指令，戰績、疲勞、評分同獎金都會再計一次)。
    // 現在指令會記錄在今場賽果的 commandHistory 作賽後檢討之用，
    // 並成為該駒之後出賽的預設跑法。
    const current = globalState.currentSimulationResult;
    const updatedResult =
      current && current.raceId === raceId
        ? {
            ...current,
            commandHistory: [
              ...(current.commandHistory || []),
              { stage: 'late' as const, choiceId: newTactic, labelZh: commandLabelZh },
            ],
          }
        : current;
    globalState = {
      ...globalState,
      horses: [...globalState.horses],
      currentSimulationResult: updatedResult,
      weeklyLogs: [`🎯【臨場戰術指揮】已對【${horse.nameZh}】下達「${commandLabelZh}」指令，已記錄作賽後檢討並成為之後出賽的預設跑法！`, ...globalState.weeklyLogs],
    };
    emitChange();
    return updatedResult;
  };

  return {
    state,
    setView,
    viewRaceReplay: viewRaceReplayAction,
    trainHorse: trainHorseAction,
    runTrackworkTrial: runTrackworkTrialAction,
    enterRace: enterRaceAction,
    withdrawRaceEntry: withdrawRaceEntryAction,
    runRaceSimulation,
    issueTacticalCommand: issueTacticalCommandAction,
    advanceWeek: advanceWeekAction,
    upgradeFacility: upgradeFacilityAction,
    buyHorse: buyHorseAction,
    breedFoal: breedFoalAction,
    resolveEventChoice: resolveEventChoiceAction,
    triggerManualEvent: triggerManualEventAction,
    completeSeasonCeremony: completeSeasonCeremonyAction,
    triggerManualCeremony: triggerManualCeremonyAction,
    socializeWithPerson: socializeWithPersonAction,
    claimObjectiveReward: claimObjectiveRewardAction,
    restartNewGame,
    exportSaveJson,
    importSaveJson,
  };
}

