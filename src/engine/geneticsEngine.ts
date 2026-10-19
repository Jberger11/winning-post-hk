// ==========================================
// 遺傳配種與血統引擎 (Pedigree & Genetics Engine)
// Winning Post 10 2026 核心機制：始祖系統、母馬活力、名馬羈絆
// ==========================================

import { Horse, HorseAttributes, PedigreeNode } from '../types/horse';
import { BreedingCandidate } from '../types/game';

// 收集祖先所有節點 ID (遞迴 4 代)
export function collectAncestorIds(node?: PedigreeNode, depth: number = 0): string[] {
  if (!node || depth >= 4) return [];
  const ids: string[] = [node.id];
  if (node.sire) ids.push(...collectAncestorIds(node.sire, depth + 1));
  if (node.dam) ids.push(...collectAncestorIds(node.dam, depth + 1));
  return ids;
}

// 檢查血統樹中是否存在自我循環 (避免祖先包含自己)
export function hasSelfAncestor(node: PedigreeNode, targetId: string, depth: number = 0): boolean {
  if (depth > 0 && node.id === targetId) return true;
  if (depth >= 6) return false;
  let found = false;
  if (node.sire) found = found || hasSelfAncestor(node.sire, targetId, depth + 1);
  if (node.dam) found = found || hasSelfAncestor(node.dam, targetId, depth + 1);
  return found;
}

// 計算近親交配係數 (Inbreeding Coefficient Approximation)
export function calculateInbreeding(sirePedigree: PedigreeNode, damPedigree: PedigreeNode): number {
  const sireAncestors = collectAncestorIds(sirePedigree);
  const damAncestors = collectAncestorIds(damPedigree);

  let commonCount = 0;
  for (const id of sireAncestors) {
    if (damAncestors.includes(id)) {
      commonCount++;
    }
  }

  // 近親交配百分比估算 (0% ~ 25%)
  return Math.min(25, commonCount * 4.5);
}

// 評估配合理論 (Pedigree Compatibility)
export function evaluateBreeding(stallion: Horse, broodmare: Horse): BreedingCandidate {
  const inbreeding = calculateInbreeding(stallion.pedigree, broodmare.pedigree);

  // 母馬活力度加成 (Broodmare Vitality: 年輕且充分休養之母馬活力更高)
  const agePenalty = Math.max(0, (broodmare.age - 8) * 4);
  const vitality = Math.max(20, broodmare.vitality - agePenalty);
  const vitalityBonus = Math.floor(vitality * 0.12);

  // 名馬劇情因子 (Drama Factor)
  const dramaIndex = Math.floor((stallion.dramaFactor + broodmare.dramaFactor) * 0.5);

  // 配合度基分
  let score = 70;
  if (inbreeding < 6) score += 15; // 異系配合 (Outcross)
  if (vitality > 80) score += 10;
  if (dramaIndex > 60) score += 12;
  if (stallion.sireLine !== broodmare.sireLine) score += 8; // 優質父系配合

  // 預估子嗣能力中位數
  const predictedAttrs: Record<string, number> = {};
  const attrKeys: (keyof HorseAttributes)[] = [
    'speed', 'stamina', 'acceleration', 'power', 'guts',
    'intelligence', 'temperament', 'health', 'flexibility', 'consistency'
  ];

  for (const key of attrKeys) {
    const sVal = stallion.attributes[key];
    const dVal = broodmare.attributes[key];
    const base = sVal * 0.45 + dVal * 0.45 + (vitalityBonus * 0.5);
    predictedAttrs[key] = Math.min(99, Math.round(base));
  }

  return {
    stallion,
    broodmare,
    compatibilityScore: score,
    inbreedingPercent: inbreeding,
    vitalityBonus,
    dramaIndex,
    predictedAttributes: predictedAttrs,
  };
}

// 孕育新一代幼駒 (Produce New Foal)
export function breedFoal(
  stallion: Horse,
  broodmare: Horse,
  foalNameZh: string,
  foalNameEn: string,
  ownerId: string,
  ownerName: string,
  nurseryBonus: number = 0
): Horse {
  // 防呆防範：不得與自身配種或近親直系違反
  if (stallion.id === broodmare.id) {
    throw new Error('繁殖失敗：不可將同一匹馬作為父系與母系');
  }

  const inbreeding = calculateInbreeding(stallion.pedigree, broodmare.pedigree);
  const candidate = evaluateBreeding(stallion, broodmare);

  const attrKeys: (keyof HorseAttributes)[] = [
    'speed', 'stamina', 'acceleration', 'power', 'guts',
    'intelligence', 'temperament', 'health', 'flexibility', 'consistency'
  ];

  const foalAttrs: Partial<HorseAttributes> = {};
  const foalCeiling: Partial<HorseAttributes> = {};

  for (const key of attrKeys) {
    const sVal = stallion.attributes[key];
    const dVal = broodmare.attributes[key];

    // 隨機突變因子 (-4 到 +4)
    const mutation = Math.floor(Math.random() * 9) - 4;

    // 近親交配過度懲罰 (體質與脾氣)
    let inbreedingPenalty = 0;
    if (inbreeding > 15 && (key === 'health' || key === 'temperament')) {
      inbreedingPenalty = Math.floor((inbreeding - 15) * 0.8);
    }

    const calculatedValue = Math.round(
      sVal * 0.45 +
      dVal * 0.45 +
      mutation +
      candidate.vitalityBonus * 0.3 -
      inbreedingPenalty
    );

    const initialAttr = Math.max(30, Math.min(85, calculatedValue));
    foalAttrs[key] = initialAttr;

    // 天賦天花板 (Ceiling)
    const ceilingBase = Math.max(
      stallion.geneticCeiling[key],
      broodmare.geneticCeiling[key]
    );
    const ceilingMutation = Math.floor(Math.random() * 7) - 2;
    foalCeiling[key] = Math.min(
      100,
      Math.max(initialAttr + 5, ceilingBase + ceilingMutation + nurseryBonus)
    );
  }

  // 決定跑法與適應
  const runningStyles: Horse['runningStyle'][] = ['front_runner', 'stalker', 'midfield', 'closer'];
  const runningStyle = Math.random() < 0.5 ? stallion.runningStyle : broodmare.runningStyle;

  const minDist = Math.round((stallion.optimalDistance.min + broodmare.optimalDistance.min) / 200) * 100;
  const maxDist = Math.round((stallion.optimalDistance.max + broodmare.optimalDistance.max) / 200) * 100;

  // 幼駒新血統節點 (Winning Post 10 2026 血統樹)
  const newPedigree: PedigreeNode = {
    id: `ped_${Date.now()}`,
    nameZh: foalNameZh,
    nameEn: foalNameEn,
    sire: stallion.pedigree,
    dam: broodmare.pedigree,
    sireLine: stallion.sireLine,
    dramaTitle: candidate.dramaIndex > 70 ? '名門繼承者' : undefined,
  };

  const isColt = Math.random() < 0.5;

  return {
    id: `foal_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    nameZh: foalNameZh,
    nameEn: foalNameEn,
    gender: isColt ? 'colt' : 'filly',
    age: 2, // 2歲初生幼駒
    color: Math.random() < 0.6 ? stallion.color : broodmare.color,
    country: 'HK',
    ownerId,
    ownerName,
    trainerId: stallion.trainerId || 'trainer_tony_cruz',
    trainerName: stallion.trainerName || '告東尼',
    isPlayerOwned: ownerId === 'player',
    rating: 52, // 自購新馬 PPG 起步評分 52分
    careerStarts: 0,
    wins: 0,
    seconds: 0,
    thirds: 0,
    totalPrizeMoney: 0,
    attributes: foalAttrs as HorseAttributes,
    geneticCeiling: foalCeiling as HorseAttributes,
    trainingProgress: {},
    runningStyle: runningStyle || 'midfield',
    preferredSurface: 'turf',
    surfaceAffinity: {
      turf: Math.min(100, Math.round((stallion.surfaceAffinity.turf + broodmare.surfaceAffinity.turf) / 2)),
      dirt: Math.min(100, Math.round((stallion.surfaceAffinity.dirt + broodmare.surfaceAffinity.dirt) / 2)),
    },
    optimalDistance: { min: Math.max(1000, minDist), max: Math.max(minDist + 200, maxDist) },
    maturityType: Math.random() < 0.5 ? stallion.maturityType : broodmare.maturityType,
    fitness: 85,
    fatigue: 0,
    morale: 80,
    isInjured: false,
    injuryWeeksRemaining: 0,
    location: 'shatin',
    pedigree: newPedigree,
    sireId: stallion.id,
    damId: broodmare.id,
    sireLine: stallion.sireLine,
    vitality: 90,
    dramaFactor: Math.min(100, candidate.dramaIndex + 10),
    dramaAchievements: [],
    raceHistory: [],
    trophies: [],
    marketValue: 8000000 + (foalAttrs.speed || 70) * 100000,
    isRetired: false,
  };
}
