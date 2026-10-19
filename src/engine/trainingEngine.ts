// ==========================================
// 晨操調教與成長引擎 (Training & Maturity Engine)
// ==========================================

import { Horse, HorseAttributes } from '../types/horse';
import { Trainer } from '../types/person';
import { FacilityUpgrade } from '../types/facility';

export type TrainingMenu =
  | 'fast_gallop'     // 晨操快跳 (專注速度、衝刺)
  | 'trotting'        // 踱步慢跳 (專注步姿、靈性)
  | 'barrier_trial'   // 1200米大閘試閘 (模擬實戰、鍛鍊鬥心)
  | 'swimming'        // 從化馬匹游泳 (鍛鍊耐力、力量，低關節負荷)
  | 'conghua_rest';   // 從化溫泉放草休養 (消減疲勞、恢復健康)

export function getMaturityFactor(age: number, maturityType: Horse['maturityType']): number {
  if (maturityType === 'early') {
    if (age <= 3) return 1.35;
    if (age === 4) return 1.15;
    if (age === 5) return 0.95;
    return 0.80;
  }
  if (maturityType === 'late') {
    if (age <= 3) return 0.85;
    if (age === 4) return 1.10;
    if (age >= 5 && age <= 7) return 1.30;
    return 1.05;
  }
  if (maturityType === 'extended') {
    if (age <= 3) return 1.10;
    if (age >= 4 && age <= 7) return 1.30;
    if (age >= 8) return 1.15;
    return 1.0;
  }
  // normal
  if (age <= 3) return 1.15;
  if (age >= 4 && age <= 6) return 1.25;
  if (age === 7) return 1.0;
  return 0.85;
}

export function applyTraining(
  horse: Horse,
  menu: TrainingMenu,
  trainer?: Trainer,
  facilities: FacilityUpgrade[] = []
): { log: string; attributeGains: Partial<Record<keyof HorseAttributes, number>> } {
  if (horse.isInjured) {
    return {
      log: `【${horse.nameZh}】目前處於傷患康復期，僅能遵照獸醫指示進行慢步靜養。`,
      attributeGains: {},
    };
  }

  const matFactor = getMaturityFactor(horse.age, horse.maturityType);
  const trainerBonus = trainer ? trainer.trainingBonus : 1.0;

  // 設施加成
  const conghuaTrackLvl = facilities.find(f => f.id === 'conghua_track')?.level || 0;
  const facilityMult = 1 + conghuaTrackLvl * 0.1;

  const targetProgress: Partial<Record<keyof HorseAttributes, number>> = {};
  let fatigueChange = 0;
  let fitnessGain = 0;
  let logText = '';

  switch (menu) {
    case 'fast_gallop':
      targetProgress.speed = 35 * matFactor * trainerBonus * facilityMult;
      targetProgress.acceleration = 30 * matFactor * trainerBonus * facilityMult;
      targetProgress.power = 15 * matFactor;
      fatigueChange = 16;
      fitnessGain = 6;
      logText = `在沙田草地進行最後試準晨操快跳，步頭開揚，反應敏捷！`;
      break;

    case 'trotting':
      targetProgress.intelligence = 30 * matFactor * trainerBonus;
      targetProgress.consistency = 30 * matFactor;
      targetProgress.temperament = 20 * matFactor;
      fatigueChange = 7;
      fitnessGain = 3;
      logText = `於內圈踱步兩圈，神態自若，情緒高度受教。`;
      break;

    case 'barrier_trial':
      targetProgress.guts = 35 * matFactor * trainerBonus;
      targetProgress.acceleration = 25 * matFactor;
      targetProgress.speed = 20 * matFactor;
      fatigueChange = 22;
      fitnessGain = 9;
      logText = `參加沙田全天候 1200 米大閘試閘，出閘反應俐落，展現強大鬥志！`;
      break;

    case 'swimming':
      targetProgress.stamina = 35 * matFactor * facilityMult;
      targetProgress.power = 25 * matFactor * facilityMult;
      targetProgress.health = 15;
      fatigueChange = 9;
      fitnessGain = 5;
      logText = `前往從化專用泳池完成游水訓練，心肺呼吸沉著，四肢毫無負擔。`;
      break;

    case 'conghua_rest':
      fatigueChange = -35;
      horse.attributes.health = Math.min(100, horse.attributes.health + 4);
      fitnessGain = -2; // 稍微放鬆
      logText = `送往從化溫泉中心享受水療放草，筋骨放鬆，疲勞一掃而空！`;
      break;
  }

  // 累加訓練進度並突破屬性
  const attributeGains: Partial<Record<keyof HorseAttributes, number>> = {};
  for (const [attrKey, progressVal] of Object.entries(targetProgress)) {
    const key = attrKey as keyof HorseAttributes;
    const currentProgress = (horse.trainingProgress[key] || 0) + progressVal;
    if (currentProgress >= 100) {
      // 升點判定 (不超過天賦上限)
      if (horse.attributes[key] < horse.geneticCeiling[key]) {
        horse.attributes[key] += 1;
        attributeGains[key] = (attributeGains[key] || 0) + 1;
      }
      horse.trainingProgress[key] = currentProgress % 100;
    } else {
      horse.trainingProgress[key] = currentProgress;
    }
  }

  // 更新體能與疲勞
  horse.fatigue = Math.max(0, Math.min(100, horse.fatigue + fatigueChange));
  horse.fitness = Math.max(50, Math.min(100, horse.fitness + fitnessGain));

  // 疲勞過高觸發受傷檢測 (Fatigue > 80 且健康低)
  if (horse.fatigue > 80 && Math.random() < (0.05 + (100 - horse.attributes.health) * 0.001)) {
    const vetLvl = facilities.find(f => f.id === 'vet_centre')?.level || 1;
    const injuryWeeks = Math.max(2, Math.floor(6 - vetLvl * 0.7));
    horse.isInjured = true;
    horse.injuryWeeksRemaining = injuryWeeks;
    logText += ` ⚠️ 警告：馬匹因劇烈勞損引發肌肉拉傷，需由獸醫進行 ${injuryWeeks} 周醫療靜養！`;
  }

  return { log: `【${horse.nameZh}】${logText}`, attributeGains };
}

// 每周自動恢復與年齡晉級
export function processWeeklyRecovery(horse: Horse, facilities: FacilityUpgrade[]): string | null {
  const spaLvl = facilities.find(f => f.id === 'spa_therapy')?.level || 0;
  const naturalFatigueRelief = 8 + spaLvl * 3;

  horse.fatigue = Math.max(0, horse.fatigue - naturalFatigueRelief);

  // 傷患恢復
  if (horse.isInjured) {
    horse.injuryWeeksRemaining -= 1;
    if (horse.injuryWeeksRemaining <= 0) {
      horse.isInjured = false;
      horse.injuryWeeksRemaining = 0;
      horse.fitness = 75;
      return `🩺【${horse.nameZh}】傷患已完全痊癒，通過獸醫檢驗，獲准恢復正常操練！`;
    }
  }
  return null;
}
