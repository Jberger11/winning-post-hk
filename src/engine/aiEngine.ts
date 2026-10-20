// ==========================================
// AI 決策與世界生態引擎 (AI World & Competitors Engine)
// 模擬對手馬主、練馬師自動報名、騎師排期與出價拍賣
// ==========================================

import { Horse } from '../types/horse';
import { RaceDefinition, RaceEntry } from '../types/race';
import { Jockey } from '../types/person';
import { HK_RACES_CALENDAR } from '../data/hkRaces';
import { createRNG } from './racingEngine';

// 字串種子 (FNV-1a): 令同一場賽事的檔位抽籤結果可重現 (重播/重開一致)
export function hashSeedFromString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// 賽事出場馬數: G1/四歲系列 14 匹，其餘 12 匹
export function getFieldSize(race: RaceDefinition): number {
  return race.grade === 'G1' || race.grade === 'CLASSIC_4YO' ? 14 : 12;
}

// 真・檔位抽籤: 以賽事 ID 為種子洗牌 1..fieldSize。
// 舊版 AI 檔位是順序 1,2,3... 分配 (可預測)，玩家檔位是完全隨機 (不可重現)。
export function getGateDrawOrder(race: RaceDefinition): number[] {
  const fieldSize = getFieldSize(race);
  const gates = Array.from({ length: fieldSize }, (_, i) => i + 1);
  const rng = createRNG(hashSeedFromString(race.id));
  for (let i = gates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [gates[i], gates[j]] = [gates[j], gates[i]];
  }
  return gates;
}

export interface RaceEligibilityContext {
  activeRaceEntries?: Record<string, string[]>;
  completedRaceIdsForWeek?: string[];
  weeklyResults?: Record<string, any>;
  currentWeek?: number;
  currentYear?: number;
  scheduledRaces?: RaceDefinition[];
}

export function isHorseEligibleForRace(
  horse: Horse,
  race: RaceDefinition,
  context?: RaceEligibilityContext
): { eligible: boolean; reason?: string; alreadyEnteredRaceId?: string } {
  if (horse.isInjured) return { eligible: false, reason: '馬匹正在傷患醫療期' };
  if (horse.isRetired) return { eligible: false, reason: '馬匹已退役' };

  // 1. 同一賽日出賽限制 (一馬一日限跑一場：本日已完賽檢測)
  // 僅當傳入 context 且目前進行至目標賽事同周時檢測，避免非賽日靜態查詢受歷史賽績干擾
  if (context?.currentWeek !== undefined && race.week === context.currentWeek) {
    const targetYear = context.currentYear;
    const alreadyRacedToday =
      horse.raceHistory?.some(
        h => h.week === context.currentWeek && (targetYear ? h.year === targetYear : true)
      ) ||
      (context.completedRaceIdsForWeek || []).some(compId => {
        const res = context.weeklyResults?.[compId];
        return res?.placings?.some((p: any) => p.horseId === horse.id);
      });

    if (alreadyRacedToday) {
      return {
        eligible: false,
        reason: '此駒本日已出賽角逐其他場次，同一個賽日不可重複出賽（香港賽馬會賽規限一日一戰）',
      };
    }
  }

  // 2. 同一賽日排位衝突檢測 (已於本賽日其他場次排位報名)
  if (context?.activeRaceEntries) {
    const otherEntry = Object.entries(context.activeRaceEntries).find(([rId, horseIds]) => {
      return (
        rId !== race.id &&
        horseIds.includes(horse.id) &&
        !(context.completedRaceIdsForWeek || []).includes(rId)
      );
    });
    if (otherEntry) {
      const otherRaceId = otherEntry[0];
      const otherRace = (context.scheduledRaces || HK_RACES_CALENDAR).find(r => r.id === otherRaceId);
      const raceNumberStr = otherRace?.raceNumber ? `第 ${otherRace.raceNumber} 場` : '';
      const raceNameStr = otherRace ? `${raceNumberStr}【${otherRace.nameZh}】` : '其他場次';
      return {
        eligible: false,
        reason: `此駒本日已報名角逐 ${raceNameStr}，每駒同日限跑一場。`,
        alreadyEnteredRaceId: otherRaceId,
      };
    }
  }

  const { minRating, maxRating, minAge, maxAge, isFourYearOldOnly } = race.conditions;

  if (horse.rating < minRating) return { eligible: false, reason: `評分不足 (需最低 ${minRating} 分，當前 ${horse.rating} 分)` };
  if (horse.rating > maxRating) return { eligible: false, reason: `評分超額 (上限 ${maxRating} 分，當前 ${horse.rating} 分)` };

  if (isFourYearOldOnly && horse.age !== 4) return { eligible: false, reason: '僅限四歲限定馬匹參賽' };
  if (horse.age < minAge || horse.age > maxAge) return { eligible: false, reason: `年齡不符 (限 ${minAge}-${maxAge} 歲)` };

  return { eligible: true };
}

// 計算馬匹對該場賽事之參賽適應性分數 (Score Formula from Blueprint)
export function evaluateRaceSuitability(horse: Horse, race: RaceDefinition): number {
  let score = 50;

  // 1. 距離適應度
  const dist = race.distance;
  if (dist >= horse.optimalDistance.min && dist <= horse.optimalDistance.max) {
    score += 25;
  } else {
    const diff = Math.min(Math.abs(dist - horse.optimalDistance.min), Math.abs(dist - horse.optimalDistance.max));
    score -= (diff / 200) * 8;
  }

  // 2. 場地適應度 (草地 vs 泥地)
  const surfaceAffinity = race.surface === 'dirt' ? horse.surfaceAffinity.dirt : horse.surfaceAffinity.turf;
  score += (surfaceAffinity - 70) * 0.4;

  // 3. 體能狀況
  if (horse.fitness > 85) score += 10;
  if (horse.fatigue > 60) score -= 25; // 疲勞過高退避

  // 4. 獎金與聲望吸引力
  if (race.grade === 'G1') score += 15;
  if (race.grade === 'CLASSIC_4YO') score += 18;

  return Math.max(0, score);
}

const HK_AI_HORSE_NAMES = [
  { zh: '魅力知遇', en: 'Beauty Destiny' },
  { zh: '喜蓮勇感', en: 'Helene Feeling' },
  { zh: '健康快車', en: 'Healthy Express' },
  { zh: '超霸勝', en: 'Super Win' },
  { zh: '新力高升', en: 'Sing Dragon' },
  { zh: '綠族光芒', en: 'Green N White' },
  { zh: '精明駿馬', en: 'Smart Leader' },
  { zh: '金運來', en: 'Golden Luck' },
  { zh: '幸運傳奇', en: 'Lucky Legend' },
  { zh: '龍之威', en: 'Dragon Pride' },
  { zh: '步步昇', en: 'Step Ahead' },
  { zh: '友瑩仁', en: 'Tomodachi' },
  { zh: '快步速', en: 'Fast Tempo' },
  { zh: '年少有威', en: 'Youthful Deal' },
  { zh: '神威傲翔', en: 'Divine Soaring' },
  { zh: '天天得樂', en: 'Daily Joy' },
  { zh: '萬事快', en: 'Fast Pace' },
  { zh: '東方飛馳', en: 'Oriental Express' },
  { zh: '輝煌先鋒', en: 'Glorious Vanguard' },
  { zh: '富貴駿馬', en: 'Fortune Steed' },
  { zh: '好彩威龍', en: 'Lucky Dragon' },
  { zh: '星際先鋒', en: 'Cosmic Pioneer' },
  { zh: '百勝同心', en: 'Century Unity' },
  { zh: '福星高照', en: 'Lucky Star' },
  { zh: '順利飛騰', en: 'Smooth Flying' },
  { zh: '雷霆金剛', en: 'Thunder King' },
  { zh: '安騁名駒', en: 'Ensued Glory' },
  { zh: '美麗滿載', en: 'Full of Beauty' },
  { zh: '勇晉神將', en: 'Brave General' },
  { zh: '快活先鋒', en: 'Happy Pioneer' },
  { zh: '大至尊', en: 'Massive Sovereign' },
  { zh: '維港奔馳', en: 'Victoria Gallop' },
  { zh: '包裝天子', en: 'Packaging Monarch' },
  { zh: '金鑽貴人', en: 'Lucky Sweynesse' },
  { zh: '遨遊氣泡', en: 'Voyage Bubble' },
  { zh: '加州星球', en: 'California Spangle' },
  { zh: '錶之銀河', en: 'Galaxy Patch' },
  { zh: '直線力山', en: 'Straight Arron' },
  { zh: '永遠美麗', en: 'Beauty Eternal' },
  { zh: '知足常樂', en: 'Sweet Encounter' },
  { zh: '紅運帝王', en: 'Red Lion' },
  { zh: '越駿歡欣', en: 'Happy Together' },
  { zh: '禪勝輝煌', en: 'Chancheng Glory' },
  { zh: '驕陽明駒', en: 'Helios Express' },
  { zh: '超超比', en: 'Chill Chibi' },
  { zh: '安遇', en: 'Encountered' },
  { zh: '威力飛馳', en: 'Power Express' },
  { zh: '潮州精神', en: 'Chiu Chow Spirit' },
  { zh: '精彩勇士', en: 'Splendid Warrior' },
  { zh: '閃耀駿足', en: 'Shining Gallop' },
  { zh: '天祿神駒', en: 'Celestial Steed' },
  { zh: '極速奇兵', en: 'Speed Raider' },
  { zh: '明心天王', en: 'Pure Monarch' },
  { zh: '飛輪之星', en: 'Tourbillon Star' },
  { zh: '勝意名揚', en: 'Victory Fame' },
  { zh: '風雲際會', en: 'Storm Encounter' },
  { zh: '海闊天空', en: 'Boundless Sky' },
  { zh: '崇山寶馬', en: 'Mountain Jewel' },
  { zh: '旋風飛將', en: 'Cyclone General' },
  { zh: '勁力神箭', en: 'Power Arrow' },
  { zh: '天王巨星', en: 'Superstar' },
  { zh: '真命天子', en: 'Chosen One' },
  { zh: '創世紀', en: 'Genesis Champion' },
  { zh: '傲勝英雄', en: 'Proud Hero' },
  { zh: '連連歡呼', en: 'Cheer Delight' },
  { zh: '天下無雙', en: 'Matchless King' },
  { zh: '勝利領袖', en: 'Victory Leader' },
  { zh: '鼎盛雄心', en: 'Prosperous Ambition' },
  { zh: '豪逸名仕', en: 'Noble Gentleman' },
  { zh: '奔馳千里', en: 'Thousand Miles' },
  { zh: '神鷹展翅', en: 'Eagle Soaring' },
  { zh: '勇猛霸主', en: 'Brave Conqueror' },
  { zh: '靈駒再起', en: 'Spirit Revival' },
  { zh: '快刀斬浪', en: 'Blade Wave' },
  { zh: '疾風飛馳', en: 'Gale Galloper' },
  { zh: '大師傳奇', en: 'Master Legend' },
  { zh: '豪傑同心', en: 'Heroic Union' },
  { zh: '金光燦爛', en: 'Golden Splendor' },
  { zh: '祥勝名駒', en: 'Auspicious Steed' },
  { zh: '瑞雪兆豐', en: 'Lucky Snow' },
  { zh: '萬事勝意', en: 'All Triumphant' },
  { zh: '駿程萬里', en: 'Steed Journey' },
  { zh: '宏圖大展', en: 'Grand Prospect' },
  { zh: '雄風再現', en: 'Heroic Rebirth' },
  { zh: '乘風破浪', en: 'Riding Waves' },
  { zh: '龍騰虎躍', en: 'Leaping Dragon' },
  { zh: '氣壯山河', en: 'Mighty Mountains' },
  { zh: '威震八方', en: 'Reign of Eight' },
  { zh: '一馬當先', en: 'Leading Steed' },
  { zh: '金玉滿堂', en: 'Abundant Gold' },
  { zh: '紫氣東來', en: 'Aura of East' },
  { zh: '鴻圖霸業', en: 'Grand Dynasty' },
  { zh: '笑傲江湖', en: 'Proud Wanderer' },
  { zh: '馳騁天下', en: 'Gallop World' },
  { zh: '天衣無縫', en: 'Flawless Beauty' },
  { zh: '神采飛揚', en: 'Vibrant Spirit' },
  { zh: '風馳電掣', en: 'Lightning Steed' },
  { zh: '雷動山川', en: 'Thunder Echo' },
  { zh: '傲雪凌霜', en: 'Frost Defier' },
  { zh: '破繭成蝶', en: 'Chrysalis Wings' },
  { zh: '勢如破竹', en: 'Unstoppable Force' },
  { zh: '龍馬精神', en: 'Dragon Vitality' },
  { zh: '百勝名將', en: 'Century General' },
  { zh: '卓越先鋒', en: 'Excellence Pioneer' },
  { zh: '光芒萬丈', en: 'Radiant Beam' },
  { zh: '雄心壯志', en: 'Lofty Ambition' },
  { zh: '名震天下', en: 'Renowned Globe' },
  { zh: '威風凜凜', en: 'Majestic Aura' },
  { zh: '氣宇軒昂', en: 'Stately Manner' },
  { zh: '驍勇善戰', en: 'Valiant Warrior' },
  { zh: '戰無不勝', en: 'Invincible Steed' },
  { zh: '捷報頻傳', en: 'Victory Reports' },
  { zh: '凱旋而歸', en: 'Triumphant Return' },
  { zh: '一鳴驚人', en: 'Blockbuster Steed' },
  { zh: '傲視同群', en: 'Peerless Pride' },
  { zh: '獨佔鰲頭', en: 'Crown Taker' },
  { zh: '錦繡前程', en: 'Splendid Future' },
  { zh: '鵬程萬里', en: 'Great Roc Flight' },
  { zh: '長勝將軍', en: 'Undefeated General' },
  { zh: '所向披靡', en: 'Sweep All Fronts' },
  { zh: '氣貫長虹', en: 'Rainbow Piercer' },
  { zh: '凌雲之志', en: 'Cloud Piercer' },
  { zh: '縱橫馳騁', en: 'Traverse Steed' },
  { zh: '超凡入聖', en: 'Transcendence' },
  { zh: '如日中天', en: 'Midday Sun' },
  { zh: '旭日東昇', en: 'Rising Sun' },
  { zh: '萬里騰雲', en: 'Cloud Galloper' },
  { zh: '風雲變色', en: 'Storm Shifter' },
  { zh: '排山倒海', en: 'Ocean Deluge' },
  { zh: '驚天動地', en: 'Earth Shaker' },
  { zh: '無懈可擊', en: 'Impeccable Force' },
  { zh: '鐵血丹心', en: 'Loyal Iron Heart' },
  { zh: '浩氣長存', en: 'Eternal Nobility' },
  { zh: '海納百川', en: 'All-Embracing' },
  { zh: '大展鴻圖', en: 'Grand Ambition' },
  { zh: '金石為開', en: 'Gold Breaker' },
  { zh: '星火燎原', en: 'Prairie Fire' },
  { zh: '春風得意', en: 'Spring Triumph' },
  { zh: '如意吉祥', en: 'Fortune Blessings' },
  { zh: '喜氣洋洋', en: 'Joyous Harmony' },
  { zh: '步步高陞', en: 'Step by Step High' },
  { zh: '平步青雲', en: 'Ascend Blue Clouds' },
  { zh: '金玉良緣', en: 'Golden Affinity' },
  { zh: '四季平安', en: 'Four Seasons Peace' },
  { zh: '生生不息', en: 'Endless Vitality' },
  { zh: '源遠流長', en: 'Everlasting River' },
  { zh: '錦上添花', en: 'Brood of Flowers' },
  { zh: '萬紫千紅', en: 'Thousand Blossoms' },
  { zh: '繁榮昌盛', en: 'Flourishing Steed' },
  { zh: '富甲天下', en: 'Wealthy Realm' },
  { zh: '安居樂業', en: 'Peaceful Steed' },
  { zh: '心想事成', en: 'Dream Realized' },
  { zh: '萬象更新', en: 'All Things Renew' },
  { zh: '風調雨順', en: 'Favorable Winds' },
  { zh: '國泰民安', en: 'Prosperous Nation' },
  { zh: '盛世豪傑', en: 'Golden Era Hero' },
  { zh: '太平盛世', en: 'Age of Peace' },
  { zh: '輝煌時代', en: 'Glorious Epoch' },
  { zh: '傳奇再現', en: 'Legend Returns' },
  { zh: '創奇先驅', en: 'Pioneering Miracle' },
  { zh: '無雙天驕', en: 'Peerless Paragon' }
];

// 動態生成符合該場賽事班次條件之 AI 賽駒
// 透過 raceNumber 與 slotIndex 偏移，確保同一賽日內各場賽事馬匹名稱 100% 獨立不重覆
export function generateAICompetitor(race: RaceDefinition, index: number): Horse {
  const raceNum = race.raceNumber || 1;
  const nameIdx = ((race.week * 17) + (raceNum - 1) * 14 + index) % HK_AI_HORSE_NAMES.length;
  const nameObj = HK_AI_HORSE_NAMES[nameIdx];
  const { minRating, maxRating, minAge, maxAge } = race.conditions;

  // 評分在此班次區間內合理分佈
  const ratingSpread = Math.max(1, maxRating - minRating);
  const rating = Math.min(maxRating, Math.max(minRating, minRating + ((index * 7 + 3) % ratingSpread)));

  // 能力值與評分呈正相關 (例如 50分 -> 能力約72-76, 80分 -> 82-86, 120分 -> 94-98)
  const baseAttr = Math.min(98, Math.max(55, Math.round(52 + (rating / 140) * 44)));
  const randOffset = (offsetSeed: number) => (((index * 13 + offsetSeed * 7) % 7) - 3);

  const tactics: Horse['runningStyle'][] = ['front_runner', 'stalker', 'midfield', 'closer'];
  const tactic = tactics[index % tactics.length];

  const trainerNames = ['告東尼', '呂健威', '蔡約翰', '沈集成', '大衛希斯', '伍鵬志', '方嘉柏', '羅富全', '姚本輝', '文家良'];
  const trainerName = trainerNames[index % trainerNames.length];

  const ageSpan = Math.max(1, maxAge - minAge + 1);
  const age = minAge + (index % ageSpan);

  return {
    id: `ai_comp_w${race.week}_r${raceNum}_slot_${index}`,
    nameZh: nameObj.zh,
    nameEn: nameObj.en,
    gender: 'gelding',
    age,
    color: ['棗色', '栗色', '黑褐', '灰馬'][index % 4],
    country: ['AUS', 'NZ', 'IRE', 'GB', 'USA'][index % 5],
    ownerId: `owner_ai_${index}`,
    ownerName: `${nameObj.zh.slice(0, 2)}好友團體`,
    trainerId: `trainer_${index}`,
    trainerName,
    isPlayerOwned: false,
    rating,
    careerStarts: 10 + (index % 12),
    wins: 1 + (index % 4),
    seconds: index % 3,
    thirds: (index + 1) % 3,
    totalPrizeMoney: rating * 50000,
    attributes: {
      speed: Math.min(100, Math.max(40, baseAttr + randOffset(1))),
      stamina: Math.min(100, Math.max(40, baseAttr + randOffset(2))),
      acceleration: Math.min(100, Math.max(40, baseAttr + randOffset(3))),
      power: Math.min(100, Math.max(40, baseAttr + randOffset(4))),
      guts: Math.min(100, Math.max(40, baseAttr + randOffset(5))),
      intelligence: Math.min(100, Math.max(40, baseAttr + randOffset(6))),
      temperament: Math.min(100, Math.max(40, baseAttr + randOffset(7))),
      health: Math.min(100, Math.max(60, 85 + randOffset(8))),
      flexibility: Math.min(100, Math.max(50, 80 + randOffset(9))),
      consistency: Math.min(100, Math.max(50, 80 + randOffset(10))),
    },
    geneticCeiling: {
      speed: Math.min(100, baseAttr + 8),
      stamina: Math.min(100, baseAttr + 8),
      acceleration: Math.min(100, baseAttr + 8),
      power: Math.min(100, baseAttr + 8),
      guts: Math.min(100, baseAttr + 8),
      intelligence: Math.min(100, baseAttr + 8),
      temperament: Math.min(100, baseAttr + 8),
      health: 95,
      flexibility: 90,
      consistency: 90,
    },
    trainingProgress: {},
    runningStyle: tactic,
    preferredSurface: race.surface,
    surfaceAffinity: {
      turf: race.surface === 'turf' ? 92 : 70,
      dirt: race.surface === 'dirt' ? 92 : 65,
    },
    optimalDistance: {
      min: Math.max(1000, race.distance - 200),
      max: race.distance + 200,
    },
    maturityType: 'normal',
    // 確定性 (禁止 Math.random): 同一種子重跑/重播必須重現原場，曾因呢三項隨機令重播變出第二個冠軍
    fitness: 85 + ((index * 11 + race.week * 3 + raceNum) % 12),
    fatigue: (index * 7 + raceNum * 3) % 20,
    morale: 80 + ((index * 5 + race.week) % 15),
    isInjured: false,
    injuryWeeksRemaining: 0,
    location: 'shatin',
    pedigree: { id: `ped_${nameObj.en}`, nameZh: nameObj.zh, nameEn: nameObj.en, sireLine: 'Danehill系' },
    sireLine: 'Danehill系',
    vitality: 80,
    dramaFactor: 40,
    dramaAchievements: [],
    raceHistory: [],
    trophies: [],
    marketValue: rating * 100000,
    isRetired: false,
  };
}

// 為指定賽事自動產生參賽馬匹 (包含 AI 報名與騎師無衝突排期)
// 確保每場賽事維持在 12 至 14 匹香港滿閘規模，且同一賽日內馬匹絕不重複出賽！
export function generateEntriesForRace(
  race: RaceDefinition,
  availableHorses: Horse[],
  jockeys: Jockey[],
  playerEntry?: RaceEntry | RaceEntry[],
  alreadyEnteredHorseIds?: Set<string> | string[],
  horseMap?: Map<string, Horse>
): RaceEntry[] {
  // 支援同場多匹玩家馬出賽 (舊版只收一匹，其餘報了名也無得跑)
  const playerEntries: RaceEntry[] = !playerEntry
    ? []
    : Array.isArray(playerEntry)
      ? playerEntry
      : [playerEntry];

  // 香港賽馬標準滿閘人數: G1/打吡一般 14 匹，其餘班次 12 匹
  const targetFieldSize = getFieldSize(race);

  const enteredSet = alreadyEnteredHorseIds
    ? (alreadyEnteredHorseIds instanceof Set ? alreadyEnteredHorseIds : new Set(alreadyEnteredHorseIds))
    : new Set<string>();

  // 1. 篩選合格 AI 馬匹（排除玩家馬、排除本周已跑過之馬匹、排除同日其他場次已出賽或排位之馬匹）
  const eligibleAIHorses = availableHorses
    .filter(h => !h.isPlayerOwned)
    .filter(h => !enteredSet.has(h.id))
    .filter(h => !h.id.startsWith('ai_comp_') || h.id.includes(`_r${race.raceNumber || 1}_`))
    .filter(h => isHorseEligibleForRace(h, race).eligible)
    .filter(h => !h.raceHistory?.some(hist => hist.week === race.week))
    .sort((a, b) => evaluateRaceSuitability(b, race) - evaluateRaceSuitability(a, race));

  // 2. 建立參賽候選池，確保每匹馬 ID 與馬名在同場及賽日內絕不重複
  const seenHorseIds = new Set<string>(enteredSet);
  const seenHorseNames = new Set<string>();

  for (const pe of playerEntries) {
    seenHorseIds.add(pe.horseId);
    seenHorseNames.add(pe.horseNameZh);
  }

  const competitorPool: Horse[] = [];
  for (const h of eligibleAIHorses) {
    if (!seenHorseIds.has(h.id) && !seenHorseNames.has(h.nameZh)) {
      seenHorseIds.add(h.id);
      seenHorseNames.add(h.nameZh);
      competitorPool.push(h);
    }
  }

  // 若現有合格 AI 馬匹不足，動態生成補齊至滿閘規模！
  const neededAICount = targetFieldSize - playerEntries.length;
  let slotCounter = 0;

  while (competitorPool.length < neededAICount) {
    const generatedHorse = generateAICompetitor(race, slotCounter++);
    if (!seenHorseIds.has(generatedHorse.id) && !seenHorseNames.has(generatedHorse.nameZh)) {
      seenHorseIds.add(generatedHorse.id);
      seenHorseNames.add(generatedHorse.nameZh);
      competitorPool.push(generatedHorse);
    }
  }

  // 若提供 horseMap，同步將本場所有參賽賽駒註冊以備物理引擎與賽後記錄調用
  if (horseMap) {
    for (const h of competitorPool) {
      horseMap.set(h.id, h);
    }
  }

  const entries: RaceEntry[] = [];
  const assignedJockeyIds = new Set<string>();
  const usedGates = new Set<number>();
  const gateDrawOrder = getGateDrawOrder(race);

  for (const pe of playerEntries) {
    entries.push(pe);
    assignedJockeyIds.add(pe.jockeyId);
    usedGates.add(pe.gate);
  }

  // 可用騎師池 (依評分高低排序)
  const availableJockeys = [...jockeys].sort((a, b) => b.rating - a.rating);

  let clothNum = playerEntries.length > 0 ? Math.max(...playerEntries.map(e => e.numberCloth)) + 1 : 1;

  for (const horse of competitorPool) {
    if (entries.length >= targetFieldSize) break;

    // 尋找尚未被指派的合適騎師 (TEST 03: 騎師不能在同場分身出賽)
    let jockey = availableJockeys.find(j => !assignedJockeyIds.has(j.id));
    if (!jockey) {
      // 若騎師庫已分派完畢，創建替補客串騎師
      jockey = {
        id: `jockey_sub_${entries.length}`,
        nameZh: `騎師${clothNum}`,
        nameEn: `Jockey ${clothNum}`,
        avatar: '🏇',
        rating: 85,
        experience: 85,
        positioning: 85,
        paceControl: 85,
        finishing: 85,
        weightClaim: 0,
        totalRides: 500,
        totalWins: 50,
        winRate: 0.1,
        preferredTrack: 'both',
        isAvailable: true,
      };
    }
    assignedJockeyIds.add(jockey.id);

    // 檔位抽籤: 按本場種子抽籤次序取第一個未用檔位 (唔再是順序 1,2,3...)
    let gate = gateDrawOrder.find(g => !usedGates.has(g)) ?? 1;
    usedGates.add(gate);

    // 計算負磅 (讓磅標準: 頂磅 135 磅，底磅 115 磅，依評分折算)
    const ratingDiff = race.conditions.maxRating - horse.rating;
    const baseWeight = Math.max(115, Math.min(135, 133 - Math.floor(ratingDiff * 0.8)));

    // 綵衣顏色隨機但穩定
    const silkColors = [
      '#e63946', '#1d3557', '#457b9d', '#2a9d8f', '#e76f51',
      '#f4a261', '#9b5de5', '#00bbf9', '#ffb703', '#06d6a0',
      '#118ab2', '#073b4c', '#8338ec', '#3a86ff'
    ];
    const silkColor = silkColors[(entries.length) % silkColors.length];

    // 初步估計賠率 (依評分與能力)
    const estAbility = (horse.attributes.speed + horse.attributes.guts + horse.rating) / 3;
    const rawOdds = Math.max(1.4, Math.min(65.0, Math.round((120 - estAbility) * 0.8 * 10) / 10));

    entries.push({
      horseId: horse.id,
      horseNameZh: horse.nameZh,
      jockeyId: jockey.id,
      jockeyNameZh: jockey.nameZh,
      trainerNameZh: horse.trainerName,
      tactic: horse.runningStyle,
      gate,
      handicapWeight: baseWeight,
      silkColor,
      numberCloth: clothNum++,
      currentOdds: rawOdds,
    });
  }

  return entries;
}
