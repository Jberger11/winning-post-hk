// ==========================================
// 馬匹相關類型定義 (Horse Types)
// ==========================================

export type Gender = 'colt' | 'filly' | 'stallion' | 'mare' | 'gelding'; // 雄馬, 雌馬, 雄馬(退役種馬), 雌馬(退役母馬), 閹馬
export type RunningStyle = 'front_runner' | 'stalker' | 'midfield' | 'closer'; // 領放, 前領, 居中, 後勁/後上
export type TrackSurface = 'turf' | 'dirt'; // 草地, 全天候泥地
export type TrackCondition = 'fast' | 'good' | 'yielding' | 'soft' | 'heavy'; // 快地, 好地, 黏地, 軟地, 爛地
export type MaturityType = 'early' | 'normal' | 'late' | 'extended'; // 早熟, 普通, 晚熟, 奧妙持效

export interface HorseAttributes {
  speed: number;        // 速度 (1-100)
  stamina: number;      // 耐力 (1-100)
  acceleration: number; // 爆發力/加速度 (1-100)
  power: number;        // 力量 (泥地/上斜/負重) (1-100)
  guts: number;         // 鬥心/膽識 (終點力拼) (1-100)
  intelligence: number; // 智商/靈性 (聽從騎師指示) (1-100)
  temperament: number;  // 脾氣/情緒穩定度 (1-100)
  health: number;       // 健康/體質 (受傷抗性) (1-100)
  flexibility: number;  // 距離適應力 (1-100)
  consistency: number;  // 穩定性 (1-100)
}

export interface PedigreeNode {
  id: string;
  nameZh: string;
  nameEn: string;
  sire?: PedigreeNode; // 父系
  dam?: PedigreeNode;  // 母系
  sireLine?: string;   // 血系 (e.g. "Northern Dancer系", "Sunday Silence系")
  dramaTitle?: string; // 殿堂稱號 (e.g. "短途傳奇", "世界草地馬王")
}

export interface RaceRecordItem {
  year: number;
  week: number;
  raceName: string;
  raceClass: string;
  track: string;
  distance: number;
  placing: number;
  fieldSize: number;
  jockeyName: string;
  weight: number;
  margin: string;
  time: string;
  prizeMoney: number;
  ratingChange: number;
}

export interface Horse {
  id: string;
  nameZh: string;
  nameEn: string;
  gender: Gender;
  age: number;
  color: string;
  country: string; // 'HK' | 'IRE' | 'AUS' | 'NZ' | 'JPN' | 'GB' | 'USA'
  ownerId: string;
  ownerName: string;
  trainerId: string;
  trainerName: string;
  isPlayerOwned: boolean;

  // 評分與班次 (HKJC Rating & Class)
  rating: number; // 0 - 145 (例如香港五班 0-40, 四班 40-60, 三班 60-80, 二班 80-100, 一班 85-110, 精英/分級賽 100+)
  careerStarts: number;
  wins: number;
  seconds: number;
  thirds: number;
  totalPrizeMoney: number;

  // 能力值與天賦上限 (Genetic Ceiling)
  attributes: HorseAttributes;
  geneticCeiling: HorseAttributes;
  trainingProgress: Partial<Record<keyof HorseAttributes, number>>;

  // 跑法特徵
  runningStyle: RunningStyle;
  preferredSurface: TrackSurface;
  surfaceAffinity: { turf: number; dirt: number }; // 0-100
  optimalDistance: { min: number; max: number }; // e.g. 1400 - 1800m
  maturityType: MaturityType;

  // 當前狀態 (動態變化)
  fitness: number;   // 狀態 (0-100)
  fatigue: number;   // 疲勞度 (0-100)
  morale: number;    // 士氣/信心 (0-100)
  isInjured: boolean;
  injuryWeeksRemaining: number;
  location: 'shatin' | 'conghua' | 'pasture'; // 沙田馬房, 從化溫泉訓練中心, 紐西蘭/澳洲放草牧場

  // 血統與傳承 (Winning Post 10 2026 核心)
  pedigree: PedigreeNode;
  sireId?: string;
  damId?: string;
  sireLine: string;
  vitality: number;     // 繁殖母馬活力度 (Broodmare Vitality)
  dramaFactor: number;  // 名馬劇情因子 (Drama Factor)
  dramaAchievements: string[]; // 達成榮譽

  // 賽事歷史
  raceHistory: RaceRecordItem[];
  trophies: string[]; // 贏得的 G1 / 4歲經典大賽盃賽

  // 市場價值 (估值 HKD)
  marketValue: number;
  isRetired: boolean;
  studFee?: number; // 退役種馬費
}
