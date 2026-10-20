// ==========================================
// 賽事與模擬類型定義 (Race & Simulation Types)
// ==========================================

import { RunningStyle, TrackCondition, TrackSurface } from './horse';

export type RaceGrade = 'G1' | 'G2' | 'G3' | 'CLASSIC_4YO' | 'CLASS_1' | 'CLASS_2' | 'CLASS_3' | 'CLASS_4' | 'CLASS_5';

export interface RaceConditionRules {
  minRating: number;
  maxRating: number;
  minAge: number;
  maxAge: number;
  allowedGenders?: ('colt' | 'filly' | 'stallion' | 'mare' | 'gelding')[];
  isFourYearOldOnly?: boolean;
}

export interface RaceDefinition {
  id: string;
  raceNumber?: number; // 場次 (例如 第 1 場 至 第 11 場)
  nameZh: string;
  nameEn: string;
  grade: RaceGrade;
  course: 'shatin' | 'happy_valley' | 'overseas';
  courseNameZh: string;
  surface: TrackSurface;
  distance: number; // in metres (e.g. 1000, 1200, 1400, 1600, 1800, 2000, 2400)
  purseHKD: number; // 賽事總獎金 (HKD)
  firstPrizeHKD: number;
  conditions: RaceConditionRules;
  week: number; // 每年第幾周 (Week 1 to 48)
  description?: string;
  trophyName?: string;
}

export interface RaceEntry {
  horseId: string;
  horseNameZh: string;
  jockeyId: string;
  jockeyNameZh: string;
  trainerNameZh: string;
  tactic: RunningStyle;
  gate: number; // 檔位 (1 to 14)
  handicapWeight: number; // 負磅 (e.g. 113 to 135 磅)
  silkColor: string; // 綵衣顏色或樣式
  numberCloth: number; // 馬布號碼
  currentOdds: number; // 獨贏賠率
}

// 實時模擬幀 (Simulation Replay Frame at 0.2s tick)
export interface HorseSimulationState {
  horseId: string;
  horseNameZh: string;
  gate: number;
  numberCloth: number;
  silkColor: string;
  currentDistance: number; // 已跑距離 (m)
  lane: number; // 跑線位置 (0=貼欄, 1=二疊, 2=三疊...)
  currentSpeed: number; // 當前秒速 (m/s)
  currentEnergy: number; // 剩餘體力 (0-100)
  isSprinting: boolean; // 是否進入直路最後衝刺
  isBlocked: boolean; // 是否受困受阻 (Traffic)
  tactic: RunningStyle;
  rank: number; // 當前排位
}

export interface RaceReplayFrame {
  timestamp: number; // 秒數 (e.g. 0.0, 0.2, 0.4...)
  horses: HorseSimulationState[];
  leaderId: string;
  paceType: 'slow' | 'normal' | 'fast';
  commentary?: string; // 廣東話旁述快訊 (例如: "大至尊在內欄尋找空位發力！")
}

export interface OfficialPlacing {
  horseId: string;
  horseNameZh: string;
  jockeyNameZh: string;
  trainerNameZh: string;
  placing: number; // 1, 2, 3...
  gate: number;
  weight: number;
  finishTimeSec: number;
  finishTimeFormatted: string; // e.g. "1:21.45"
  marginText: string; // e.g. "短馬頭", "半馬位", "1 1/2", "3 1/4"
  prizeMoneyHKD: number;
  ratingChange: number; // +8 for dominant win, -1 for 6th+
  odds: number;
}

export interface TacticalReviewFactor {
  label: string;
  text: string;
  impact: number; // 正數為正面貢獻，負數為蝕位或失誤
}

export interface TacticalReviewReport {
  horseId: string;
  horseNameZh: string;
  jockeyNameZh: string;
  trainerNameZh: string;
  expectedPlacing: number;
  actualPlacing: number;
  delta: number; // expectedPlacing - actualPlacing
  verdict: string;
  factors: TacticalReviewFactor[];
  trainerQuote: string;
  stewardsReport: string;
  compatibilityDelta: number;
  trustDelta: number;
  avgCornerLane: number;
  blockedTicks: number;
  energyAt400m: number;
}

export type MidRaceCheckpointId = 'start' | 'early' | 'mid' | 'late' | 'final';

export interface RaceSimulationResult {
  raceId: string;
  raceNameZh: string;
  raceGrade: RaceGrade;
  courseNameZh: string;
  distance: number;
  surface: TrackSurface;
  going: TrackCondition;
  seed: number;
  winningTime: string;
  placings: OfficialPlacing[];
  replayFrames: RaceReplayFrame[];
  commentaryLog: string[];
  tacticalReview?: TacticalReviewReport;
  commandHistory?: { stage: MidRaceCheckpointId; choiceId: string; labelZh: string }[];
  entries?: RaceEntry[]; // 出賽陣容快照 (重播時原陣容重現，唔再重新生成對手)
}

