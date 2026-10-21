// ==========================================
// 核心遊戲存檔與狀態定義 (Game State Types)
// ==========================================

import { Horse } from './horse';
import { RaceDefinition, RaceSimulationResult } from './race';
import { Jockey, Trainer, Owner } from './person';
import { FacilityUpgrade, FinancialTransaction } from './facility';

export type GameView =
  | 'dashboard'         // 大本營總覽
  | 'my_horses'         // 我的馬房賽駒
  | 'calendar'          // 香港賽馬排位日程 (日賽/夜賽)
  | 'race_entry'        // 報名與騎師戰術安排
  | 'live_race'         // 2D 即時賽事直播模擬 (Winning Post 實況)
  | 'race_result'       // 賽果報告與派彩
  | 'training'          // 晨操及從化調教
  | 'market'            // 香港國際馬匹拍賣會 (HKIS) & 馬匹買賣
  | 'breeding'          // 配種繁育中心 (Winning Post 10 2026 血統配合)
  | 'facilities'        // 從化基地與馬房設施升級
  | 'jockeys_trainers'  // 騎師與練馬師資料庫
  | 'rankings'          // 馬王寶座、冠軍練馬師、名人堂
  | 'finances';         // 財務流水賬

export interface GameCalendarWeek {
  year: number; // e.g. 2026
  season: string; // e.g. "2026/2027 馬季"
  week: number; // 1 to 48 (每季 48 周，約 88 次賽事)
  isRaceWeekend: boolean;
  meetingLocation: 'shatin' | 'happy_valley' | 'overseas';
  meetingType: 'day' | 'night'; // 日賽 (沙田多為周日), 夜賽 (快活谷多為周三)
}

export interface BreedingCandidate {
  stallion: Horse;
  broodmare: Horse;
  compatibilityScore: number; // 配合度評分 (A, S, B, C)
  inbreedingPercent: number; // 近親交配率 %
  vitalityBonus: number;     // 繁殖母馬活力加成
  dramaIndex: number;        // 名馬羈絆因子
  predictedAttributes: Record<string, number>;
}

export interface InteractiveEventChoice {
  id: string;
  label: string;
  hint: string;
  outcomeText: string;
  fundsDeltaHKD?: number;
  reputationDelta?: number;
  jockeyBondDelta?: number;
  trainerTrustDelta?: number;
  moraleDelta?: number;
  fitnessDelta?: number;
  fatigueDelta?: number;
}

export interface InteractiveGameEvent {
  id: string;
  title: string;
  category: 'stable_politics' | 'media' | 'social' | 'medical' | 'international';
  description: string;
  choices: InteractiveEventChoice[];
}

export interface SeasonAwardsSummary {
  seasonLabel: string;
  championHorseNameZh: string;
  championTrainerNameZh: string;
  championJockeyNameZh: string;
  playerWinsSeason: number;
  playerPrizeSeasonHKD: number;
  speechDone?: boolean;
}

export interface GameState {
  version: string;
  saveName: string;
  playerStableName: string;
  playerFundsHKD: number;
  currentCalendar: GameCalendarWeek;
  currentView: GameView;

  // 實體數據庫
  horses: Horse[];
  jockeys: Jockey[];
  trainers: Trainer[];
  owners: Owner[];
  facilities: FacilityUpgrade[];
  transactions: FinancialTransaction[];

  // 當周賽事安排
  scheduledRaces: RaceDefinition[];
  activeRaceEntries: Record<string, string[]>; // raceId -> horseIds entered
  activeEntryJockeys?: Record<string, Record<string, string>>; // raceId -> { horseId: jockeyId }
  currentActiveRaceIndex: number;
  currentSimulationResult: RaceSimulationResult | null;
  completedRaceIdsForWeek: string[]; // 本周已完成之賽事 ID 清單
  weeklyResults: Record<string, RaceSimulationResult>; // raceId -> 賽果

  // 歷史記錄與榮譽
  completedRacesHistory: RaceSimulationResult[];
  hallOfFame: {
    horseId: string;
    nameZh: string;
    title: string;
    yearInducted: number;
    stats: string;
  }[];

  // 待處理事件/通知 (週報)
  weeklyLogs: string[];

  // 新增：Jockey Life x Winning Post 深度玩法系統
  recentPlacings?: number[]; // 最近 10 場玩家賽駒名次（計算馬房手風走勢）
  horseJockeyAffinity?: Record<string, number>; // `${horseId}_${jockeyId}` -> 0..100 人馬合拍度
  activeEvent?: InteractiveGameEvent | null; // 當前觸發之馬圈突發事件抉擇
  seasonCeremony?: SeasonAwardsSummary | null; // 季末香港冠軍人馬獎頒獎禮
  careerMilestones?: Record<string, { year: number; week: number }>; // 已解鎖生涯里程碑
  claimedObjectiveIds?: string[]; // 已領獎的賽季目標 ID (seasonObjectives)
  trackworkTrialDoneWeek?: Record<string, number>; // horseId -> week number (本周是否已完成互動晨操試蹄)
  interactiveRaceDefault?: boolean; // 是否預設開啟臨場戰術指揮模式
  stableReputation?: number; // 馬房業界聲望 (0-100)
  lastWeekSummary?: WeekSummary | null; // 推進下一周後彈出的上周結算 (睇完清走)
}

export interface WeekSummaryRaceLine {
  raceId: string;
  raceNameZh: string;
  horseNameZh: string;
  placing: number;
  fieldSize: number;
  prizeHKD: number; // 馬主份額
  autoRun: boolean; // 推進時自動快速出賽
}

export interface WeekSummaryHorseLine {
  horseId: string;
  nameZh: string;
  fatigueBefore: number;
  fatigueAfter: number;
  fitness: number;
  isInjured: boolean;
}

export interface WeekSummary {
  year: number;
  week: number;
  races: WeekSummaryRaceLine[];
  prizeIncomeHKD: number;
  expensesHKD: number;
  fundsAfterHKD: number;
  horses: WeekSummaryHorseLine[];
  nextWeekRaceCount: number;
  nextWeekEnterableRaceCount: number; // 下周有至少一匹玩家馬夠資格嘅場數
}

