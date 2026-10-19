// ==========================================
// 深度玩法擴充引擎 (Jockey Life x Winning Post 10 HK Upgrade Engine)
// 包含：賽後戰術檢討、馬圈日報頭條、手風走勢、晨操試蹄考驗、突發事件抉擇與頒獎禮
// ==========================================

import { Horse } from '../types/horse';
import { Jockey, Trainer } from '../types/person';
import {
  OfficialPlacing,
  RaceDefinition,
  RaceReplayFrame,
  TacticalReviewFactor,
  TacticalReviewReport,
} from '../types/race';
import {
  GameState,
  InteractiveGameEvent,
  SeasonAwardsSummary,
} from '../types/game';

// 1. 馬房手風走勢計算 (Momentum Streak)
export interface StableMomentumInfo {
  code: 'hot' | 'warm' | 'normal' | 'cold' | 'slump';
  badgeZh: string;
  descZh: string;
  winsLast10: number;
  top3Last10: number;
  moraleBonus: number;
}

export function getStableMomentum(recentPlacings: number[] = []): StableMomentumInfo {
  const last10 = recentPlacings.slice(0, 10);
  const wins = last10.filter(p => p === 1).length;
  const top3 = last10.filter(p => p <= 3).length;

  if (wins >= 3 || (wins >= 2 && top3 >= 5)) {
    return {
      code: 'hot',
      badgeZh: '🔥 手風極順',
      descZh: `近 ${last10.length} 戰奪 ${wins} 冠 ${top3 - wins} 位，馬房上下士氣高昂，騎師爭相效力！`,
      winsLast10: wins,
      top3Last10: top3,
      moraleBonus: 5,
    };
  }
  if (wins >= 1 && top3 >= 3) {
    return {
      code: 'warm',
      badgeZh: '📈 狀態上揚',
      descZh: `近 ${last10.length} 戰獲 ${wins} 冠 ${top3} 次上名，馬房運勢穩步向好。`,
      winsLast10: wins,
      top3Last10: top3,
      moraleBonus: 2,
    };
  }
  if (last10.length >= 5 && wins === 0 && top3 === 0) {
    return {
      code: 'slump',
      badgeZh: '🥶 頭馬荒',
      descZh: `近 ${last10.length} 戰未嚐上名，馬房陷入低潮，急需一場勝仗重振聲威！`,
      winsLast10: 0,
      top3Last10: 0,
      moraleBonus: -3,
    };
  }
  if (last10.length >= 4 && wins === 0) {
    return {
      code: 'cold',
      badgeZh: '📉 手風轉冷',
      descZh: `近期屢拼僅得接近名次，欠缺臨門一腳運氣。`,
      winsLast10: 0,
      top3Last10: top3,
      moraleBonus: -1,
    };
  }
  return {
    code: 'normal',
    badgeZh: '➖ 表現平穩',
    descZh: last10.length === 0 ? '新季開鑼蓄勢待發，尚未有近期出賽紀錄。' : `近 ${last10.length} 戰獲 ${wins} 冠 ${top3} 次上名，表現正常。`,
    winsLast10: wins,
    top3Last10: top3,
    moraleBonus: 0,
  };
}

// 2. 《馬圈日報》頭條新聞生成 (HK Racing Post Frontpage)
export interface NewspaperEdition {
  dateLabel: string;
  headlineTitle: string;
  headlineBody: string;
  sideStories: { tag: string; title: string }[];
}

export function generateNewspaperEdition(state: GameState): NewspaperEdition {
  const { year, week, meetingLocation } = state.currentCalendar;
  const venueZh = meetingLocation === 'happy_valley' ? '跑馬地快活谷夜賽' : '沙田馬場日賽';
  const featureRace = [...state.scheduledRaces].sort((a, b) => b.purseHKD - a.purseHKD)[0];
  const playerHorses = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);
  const starHorse = [...playerHorses].sort((a, b) => b.rating - a.rating)[0];
  const lastResult = state.completedRacesHistory[0];

  let headlineTitle = `【焦點大賽】本周${venueZh}重頭戲「${featureRace?.nameZh.replace(/^第\d+場:\s*/, '') || '香港錦標'}」群雄並起！`;
  let headlineBody = `總獎金高達 HK$${(featureRace?.purseHKD || 4000000).toLocaleString()}，各路大馬房精銳盡出。${
    starHorse ? `【${state.playerStableName}】鎮房之寶「${starHorse.nameZh}」（評分 ${starHorse.rating} 分）晨操火氣十足，備受馬迷看好！` : ''
  }`;

  if (lastResult) {
    const winner = lastResult.placings[0];
    const isPlayerWin = playerHorses.some(h => h.id === winner?.horseId);
    if (isPlayerWin && winner) {
      headlineTitle = `【捷報頻傳】${state.playerStableName}名駒「${winner.horseNameZh}」勇奪${lastResult.raceNameZh.replace(/^第\d+場:\s*/, '')}桂冠！`;
      headlineBody = `鞍上人${winner.jockeyNameZh}發揮淋漓盡致，以 ${winner.finishTimeFormatted || lastResult.winningTime} 強勢衝線，練馬師${winner.trainerNameZh}盛讚馬匹質素非凡！`;
    }
  }

  const sideStories = [
    {
      tag: '晨操風向',
      title: starHorse
        ? `「${starHorse.nameZh}」沙田草地快跳步頭硬朗，狀態達 ${starHorse.fitness}%`
        : '沙田晨操多匹自購新馬試閘走勢悅目',
    },
    {
      tag: '騎師動態',
      title: '潘頓與何澤堯本季龍虎榜爭持激烈，大師傅座騎搶手',
    },
    {
      tag: '從化快訊',
      title: '從化雙邊營運見成效，北上休養賽駒回港即交出頭馬',
    },
  ];

  return {
    dateLabel: `${year}年 第 ${week} 周 • 香港馬圈日報`,
    headlineTitle,
    headlineBody,
    sideStories,
  };
}

// 3. 賽後詳細戰術檢討與練馬師評語 (Post-Race Tactical Review & Stewards Report)
export function generateTacticalReview(
  race: RaceDefinition,
  placings: OfficialPlacing[],
  frames: RaceReplayFrame[],
  playerHorse: Horse,
  jockey: Jockey
): TacticalReviewReport {
  const playerPlacingObj = placings.find(p => p.horseId === playerHorse.id) || placings[0];
  const actualPlacing = playerPlacingObj.placing;

  // 按賠率推算賽前預期名次
  const sortedByOdds = [...placings].sort((a, b) => a.odds - b.odds);
  const expectedPlacing = Math.max(1, sortedByOdds.findIndex(p => p.horseId === playerHorse.id) + 1);
  const delta = expectedPlacing - actualPlacing;

  // 統計走位疊數、受阻幀數與 400m 剩餘體力
  let laneSum = 0;
  let laneCount = 0;
  let blockedTicks = 0;
  let energyAt400m = 55;
  const dist400m = race.distance - 400;

  for (const frame of frames) {
    const hs = frame.horses.find(h => h.horseId === playerHorse.id);
    if (!hs) continue;
    if (hs.currentDistance < dist400m) {
      laneSum += hs.lane;
      laneCount += 1;
    }
    if (hs.isBlocked) blockedTicks += 1;
    if (Math.abs(hs.currentDistance - dist400m) < 12) {
      energyAt400m = hs.currentEnergy;
    }
  }

  const avgCornerLane = laneCount > 0 ? Math.round((laneSum / laneCount) * 10) / 10 : 1.0;
  const factors: TacticalReviewFactor[] = [];

  // 因子 1：彎位走位疊數得失
  if (avgCornerLane <= 1.1) {
    factors.push({
      label: '彎位走位',
      text: `全程貼欄慳位（平均 ${avgCornerLane} 疊），彎道節省約 1.5 個馬位腳力`,
      impact: 2,
    });
  } else if (avgCornerLane >= 2.2) {
    const lostLengths = (avgCornerLane * 0.75).toFixed(1);
    factors.push({
      label: '彎位走位',
      text: `轉彎被迫走外疊（平均 ${avgCornerLane} 疊），多跑路程蝕約 ${lostLengths} 個馬位`,
      impact: -2,
    });
  } else {
    factors.push({
      label: '彎位走位',
      text: `守二疊有遮擋好位（平均 ${avgCornerLane} 疊），走勢暢順`,
      impact: 1,
    });
  }

  // 因子 2：出閘與戰術步速配合
  const paceType = frames[0]?.paceType || 'normal';
  const style = playerHorse.runningStyle;
  if ((paceType === 'fast' && (style === 'closer' || style === 'midfield')) || (paceType === 'slow' && style === 'front_runner')) {
    factors.push({
      label: '步速與臨場指令',
      text: `賽事早段步速（${paceType === 'fast' ? '偏快' : '偏慢'}）完美配合【${jockey.nameZh}】的留放部署`,
      impact: 2,
    });
  } else if (paceType === 'fast' && style === 'front_runner') {
    factors.push({
      label: '步速與臨場指令',
      text: `早段快馬林立互燒，前領消耗較多體力`,
      impact: -1,
    });
  } else {
    factors.push({
      label: '步速與臨場指令',
      text: `出閘反應正常，按賽前部署穩定跟隨馬群節奏`,
      impact: 1,
    });
  }

  // 因子 3：直路受困檢討
  if (blockedTicks >= 8) {
    factors.push({
      label: '直路際遇',
      text: `直路初段嚴重受困塞車（受阻 ${(blockedTicks * 0.2).toFixed(1)} 秒），錯失最佳望空衝刺時機`,
      impact: -3,
    });
  } else if (blockedTicks >= 3) {
    factors.push({
      label: '直路際遇',
      text: `入直路一度受前駒阻擋，移出外疊後始能望空發力`,
      impact: -1,
    });
  } else {
    factors.push({
      label: '直路際遇',
      text: `入直路即順利望空，全程毫無阻滯盡展步頭`,
      impact: 2,
    });
  }

  // 因子 4：末段體力分配
  if (energyAt400m < 32) {
    factors.push({
      label: '末段體力分配',
      text: `最後 400 米體力僅剩 ${Math.round(energyAt400m)}%，中段發力稍早導致末段腳軟`,
      impact: -2,
    });
  } else if (energyAt400m > 68 && actualPlacing > 3) {
    factors.push({
      label: '末段體力分配',
      text: `入直路餘力仍達 ${Math.round(energyAt400m)}%，留得稍後未能完全發揮後勁`,
      impact: -1,
    });
  } else {
    factors.push({
      label: '末段體力分配',
      text: `400米處保有 ${Math.round(energyAt400m)}% 充沛餘力，末段衝刺貫注到底`,
      impact: 2,
    });
  }

  // 因子 5：終點壓線表現
  if (actualPlacing === 1 && (playerPlacingObj.marginText.includes('頭') || playerPlacingObj.marginText.includes('頸'))) {
    factors.push({
      label: '終點壓線',
      text: `終點前與對手短兵相接，騎師全力催策以極微距離險勝壓線！`,
      impact: 3,
    });
  }

  let verdict = '👍 大致跑出應有水準';
  if (actualPlacing === 1 && expectedPlacing >= 4) verdict = '🔥 超水準神級發揮（爆冷奪冠）';
  else if (delta >= 3 || actualPlacing === 1) verdict = '✨ 跑出好過預期';
  else if (delta <= -4) verdict = '⚠️ 大幅失準';
  else if (delta <= -2) verdict = '📉 表現略遜預期';

  // 練馬師賽後評語
  let trainerQuote = `「${playerHorse.trainerName}：今仗名次同預期差唔多，馬匹跑完狀態正常，返馬房再作調整。」`;
  if (actualPlacing === 1) {
    trainerQuote = `「${playerHorse.trainerName}：贏得太漂亮！${jockey.nameZh}走位無懈可擊，完全發揮出『${playerHorse.nameZh}』嘅真正實力！」`;
  } else if (actualPlacing <= 3 && delta >= 1) {
    trainerQuote = `「${playerHorse.trainerName}：面對強手跑到第 ${actualPlacing} 名非常收貨！人馬合拍度明顯提升，下場更值得期待。」`;
  } else if (blockedTicks >= 6) {
    trainerQuote = `「${playerHorse.trainerName}：今場純粹輸喺直路塞車無位出，隻馬本身狀態好好，千祈唔好灰心，下次補中！」`;
  } else if (delta <= -2) {
    trainerQuote = `「${playerHorse.trainerName}：今場走位蝕咗少少，加上早段步速唔太夾，返去睇吓錄影帶檢討吓。」`;
  }

  // 競賽小組報告 (Stewards' Report)
  let stewardsReport = `競賽小組報告：【${playerHorse.nameZh}】全程走勢良佳，並無異常報告。`;
  if (blockedTicks >= 6) {
    stewardsReport = `競賽小組報告：【${playerHorse.nameZh}】於直路早段（約 300 米至 150 米處）在雙駒之間受困而未能望空，直至末段移出外疊方能全力施為。`;
  } else if (avgCornerLane >= 2.3) {
    stewardsReport = `競賽小組報告：【${playerHorse.nameZh}】大部分途程在沒有遮擋下走外疊，轉彎時多跑路程。`;
  } else if (actualPlacing === 1) {
    stewardsReport = `競賽小組報告：頭馬【${playerHorse.nameZh}】賽後依例抽取樣本檢驗，直路衝刺凌厲。`;
  }

  const compatibilityDelta = actualPlacing === 1 ? 8 : actualPlacing <= 3 ? 5 : 2;
  const trustDelta = actualPlacing === 1 ? 6 : actualPlacing <= 3 ? 3 : delta <= -3 ? -2 : 1;

  return {
    horseId: playerHorse.id,
    horseNameZh: playerHorse.nameZh,
    jockeyNameZh: jockey.nameZh,
    trainerNameZh: playerHorse.trainerName,
    expectedPlacing,
    actualPlacing,
    delta,
    verdict,
    factors,
    trainerQuote,
    stewardsReport,
    compatibilityDelta,
    trustDelta,
    avgCornerLane,
    blockedTicks,
    energyAt400m,
  };
}

// 4. 今日晨操試蹄考驗 (Interactive Morning Trackwork Challenge)
export interface TrackworkChallenge {
  id: string;
  trainerInstructionZh: string;
  targetSectionalZh: string;
  optimalChoiceId: 'steady_rail' | 'follow_relax' | 'late_surge' | 'push_early';
  options: {
    id: 'steady_rail' | 'follow_relax' | 'late_surge' | 'push_early';
    labelZh: string;
    descZh: string;
  }[];
}

export const TRACKWORK_CHALLENGES: TrackworkChallenge[] = [
  {
    id: 'tw_relax_surge',
    trainerInstructionZh: '「早段跟住前駒後面放鬆跑，入直路最後 200 米先好輕騎加快試反應！」',
    targetSectionalZh: '目標分段：24.8s → 23.5s → 21.8s (末段加速)',
    optimalChoiceId: 'late_surge',
    options: [
      { id: 'steady_rail', labelZh: '貼欄均速慢跳', descZh: '全程維持 24.0s 均速，不特別催策' },
      { id: 'follow_relax', labelZh: '全程緊隨前駒按韁', descZh: '重注放鬆口勁，末段不催策' },
      { id: 'late_surge', labelZh: '早段留後放鬆・末段 200m 望空催策', descZh: '精準執行前慢後快分段考驗' },
      { id: 'push_early', labelZh: '出彎即開始搶放快跳', descZh: '早段高速搶放，考驗長力' },
    ],
  },
  {
    id: 'tw_rail_pace',
    trainerInstructionZh: '「今日試沙田草地 800 米，全程貼住內欄維持均速步韻，千祈唔好畀隻馬搶口！」',
    targetSectionalZh: '目標分段：23.4s → 23.2s (均速穩定)',
    optimalChoiceId: 'steady_rail',
    options: [
      { id: 'steady_rail', labelZh: '貼欄穩守均速・嚴控步韻', descZh: '精準把控每兩百米分段時間一致' },
      { id: 'follow_relax', labelZh: '大外疊跟跑吹風', descZh: '走外疊避開馬群' },
      { id: 'late_surge', labelZh: '留住最尾末段狂衝', descZh: '刻意留後再爆發' },
      { id: 'push_early', labelZh: '開閘即推騎快放', descZh: '首段造出 21.9s 極快步速' },
    ],
  },
  {
    id: 'tw_settle_temper',
    trainerInstructionZh: '「呢匹馬近期火氣比較大，今日晨操拍跳最緊要教識佢跟住伴跳馬放鬆口勁！」',
    targetSectionalZh: '目標：全程順走不搶口・呼吸順暢',
    optimalChoiceId: 'follow_relax',
    options: [
      { id: 'steady_rail', labelZh: '單獨貼欄快跳', descZh: '無遮擋下獨自領放' },
      { id: 'follow_relax', labelZh: '借伴跳馬遮擋・輕撫馬頸放鬆', descZh: '讓馬匹學會留力與聽從指示' },
      { id: 'late_surge', labelZh: '直路開鞭試極限', descZh: '催谷鬥心但容易令馬匹更急躁' },
      { id: 'push_early', labelZh: '與伴跳馬鬥燒搶頭', descZh: '全程高速比拼' },
    ],
  },
];

export interface TrackworkEvaluation {
  grade: 'S' | 'A' | 'B';
  totalScore: number;
  executionScore: number;
  paceScore: number;
  relaxScore: number;
  summaryZh: string;
  compatibilityBonus: number;
  statBoostAttr: 'speed' | 'acceleration' | 'intelligence' | 'guts';
  statBoostAmount: number;
}

export function evaluateTrackworkChallenge(
  challenge: TrackworkChallenge,
  choiceId: string,
  horse: Horse
): TrackworkEvaluation {
  const isOptimal = choiceId === challenge.optimalChoiceId;
  const executionScore = isOptimal ? 95 : 74;
  const paceScore = isOptimal ? 92 : 76;
  const relaxScore = Math.min(99, 75 + Math.round(horse.attributes.temperament * 0.2) + (isOptimal ? 8 : 0));
  const totalScore = Math.round((executionScore + paceScore + relaxScore) / 3);
  const grade: 'S' | 'A' | 'B' = totalScore >= 90 ? 'S' : totalScore >= 80 ? 'A' : 'B';

  const statBoostAttr: 'speed' | 'acceleration' | 'intelligence' | 'guts' =
    choiceId === 'late_surge'
      ? 'acceleration'
      : choiceId === 'steady_rail'
      ? 'speed'
      : choiceId === 'follow_relax'
      ? 'intelligence'
      : 'guts';

  const statBoostAmount = grade === 'S' ? 2 : 1;
  const compatibilityBonus = grade === 'S' ? 8 : 4;

  const summaryZh =
    grade === 'S'
      ? `🏅【S級完美試蹄】練馬師${horse.trainerName}拍爛手掌：「分段時間準到好似瑞士鐘錶咁！【${horse.nameZh}】狀態同人馬合拍度大升！」`
      : `👍【${grade}級合格晨操】練馬師${horse.trainerName}點頭：「整體走勢唔錯，馬匹吸收到操練效果。」`;

  return {
    grade,
    totalScore,
    executionScore,
    paceScore,
    relaxScore,
    summaryZh,
    compatibilityBonus,
    statBoostAttr,
    statBoostAmount,
  };
}

// 5. 馬圈突發事件抉擇 (Interactive HK Racing Dilemma Events)
export const HK_RACING_EVENTS: InteractiveGameEvent[] = [
  {
    id: 'evt_jockey_battle',
    title: '⚔️ 帥印爭奪戰：大師傅主動索騎',
    category: 'stable_politics',
    description:
      '沙田晨操過後，冠軍級大師傅潘頓透過經理人主動聯絡你的馬房，表示十分欣賞你名下主力賽駒的質素，希望下仗能親身執韁。然而原本一直幫手操馬的華將何澤堯亦對該駒充滿感情。你會如何抉擇？',
    choices: [
      {
        id: 'give_purton',
        label: '委任冠軍大師傅執韁，全力搏殺大賽',
        hint: '馬房聲望 +4 • 賽駒戰意提升',
        outcomeText: '大師傅公開盛讚你的賽駒具備一級賽潛質，馬迷與傳媒關注度大增！',
        reputationDelta: 4,
        jockeyBondDelta: 6,
        moraleDelta: 5,
      },
      {
        id: 'keep_loyal',
        label: '力挺原配騎師，重情重義不換人',
        hint: '練馬師信任 +8 • 騎師交情大幅提升',
        outcomeText: '馬圈中人紛紛稱讚你是有情有義的良心馬主，原配騎師感激萬分，晨操格外賣力！',
        trainerTrustDelta: 8,
        jockeyBondDelta: 12,
        fitnessDelta: 4,
      },
    ],
  },
  {
    id: 'evt_happy_valley_box',
    title: '🥂 跑馬地夜賽：遴選會員廂房社交晚宴',
    category: 'social',
    description:
      '周三快活谷夜馬燈火通明，多位香港大馬主與冠軍練馬師在遴選會員廂房設宴交流配種與自購馬心得，並邀請你出席分享「傲翔馬房」的經營之道。',
    choices: [
      {
        id: 'host_champagne',
        label: '豪氣開香檳宴請全場名流 (HK$150,000)',
        hint: '資金 -HK$15萬 • 聲望 +8 • 練馬師信任 +8',
        outcomeText: '你在廂房談笑風生，與蔡約翰、告東尼等大練馬師建立深厚交情，馬房聲譽鵲起！',
        fundsDeltaHKD: -150000,
        reputationDelta: 8,
        trainerTrustDelta: 8,
      },
      {
        id: 'low_key_talk',
        label: '低調與獸醫及血統專家深入交流',
        hint: '全體賽駒狀態 +4 • 疲勞 -5',
        outcomeText: '你從首席獸醫口中獲得寶貴的從化水療養護秘訣，旗下賽駒體能恢復加快！',
        fitnessDelta: 4,
        fatigueDelta: -5,
      },
    ],
  },
  {
    id: 'evt_media_interview',
    title: '🎙️《馬圈日報》獨家專訪邀約',
    category: 'media',
    description:
      '《馬圈日報》總編輯希望為你的「傲翔馬房」撰寫頭版專題報導，詢問你對本季香港四歲經典系列賽與一級賽的爭標宣言。',
    choices: [
      {
        id: 'bold_claim',
        label: '霸氣宣言：「本季目標直指香港打吡與國際賽桂冠！」',
        hint: '聲望 +6 • 贊助獎金 +HK$250,000',
        outcomeText: '豪言壯語引爆全港馬迷熱議，品牌贊助商即時送上 HK$250,000 宣傳贊助費！',
        fundsDeltaHKD: 250000,
        reputationDelta: 6,
      },
      {
        id: 'humble_focus',
        label: '謙遜務實：「一切以馬匹福祉與健康為先。」',
        hint: '練馬師信任 +6 • 賽駒士氣 +5',
        outcomeText: '練馬師與馬房員工對你的穩健作風深感認同，馬房上下團結一致！',
        trainerTrustDelta: 6,
        moraleDelta: 5,
      },
    ],
  },
];

export function pickWeeklyEvent(week: number, year: number): InteractiveGameEvent | null {
  // 每隔 3 周觸發一次精選馬圈突發事件
  if (week % 3 !== 0) return null;
  const idx = (week + year) % HK_RACING_EVENTS.length;
  return HK_RACING_EVENTS[idx];
}

// 6. 季末香港冠軍人馬獎頒獎禮與生涯里程碑 (Season Ceremony & Milestones)
export function generateSeasonCeremony(state: GameState): SeasonAwardsSummary {
  const activeHorses = state.horses.filter(h => !h.isRetired);
  const topHorse = [...activeHorses].sort((a, b) => b.rating - a.rating)[0];
  const topTrainer = [...state.trainers].sort((a, b) => b.totalWins - a.totalWins)[0];
  const topJockey = [...state.jockeys].sort((a, b) => b.totalWins - a.totalWins)[0];

  const playerHorses = state.horses.filter(h => h.isPlayerOwned);
  const playerWinsSeason = playerHorses.reduce((sum, h) => sum + h.wins, 0);
  const playerPrizeSeasonHKD = playerHorses.reduce((sum, h) => sum + h.totalPrizeMoney, 0);

  return {
    seasonLabel: state.currentCalendar.season,
    championHorseNameZh: topHorse?.nameZh || '浪漫勇士',
    championTrainerNameZh: topTrainer?.nameZh || '蔡約翰',
    championJockeyNameZh: topJockey?.nameZh || '潘頓',
    playerWinsSeason,
    playerPrizeSeasonHKD,
    speechDone: false,
  };
}

export interface CareerMilestoneDef {
  id: string;
  icon: string;
  nameZh: string;
  descZh: string;
  tier: string;
  isUnlocked: (state: GameState) => boolean;
  progressText: (state: GameState) => string;
}

export const CAREER_MILESTONES: CareerMilestoneDef[] = [
  {
    id: 'ms_first_win',
    icon: '🏆',
    nameZh: '初試啼聲',
    descZh: '旗下賽駒贏得馬房首場頭馬勝利',
    tier: '銅章',
    isUnlocked: s => s.horses.filter(h => h.isPlayerOwned).reduce((acc, h) => acc + h.wins, 0) >= 1,
    progressText: s => `${Math.min(1, s.horses.filter(h => h.isPlayerOwned).reduce((acc, h) => acc + h.wins, 0))}/1 勝`,
  },
  {
    id: 'ms_ten_wins',
    icon: '🌟',
    nameZh: '十勝名門',
    descZh: '旗下賽駒累積贏得 10 場頭馬',
    tier: '銀章',
    isUnlocked: s => s.horses.filter(h => h.isPlayerOwned).reduce((acc, h) => acc + h.wins, 0) >= 10,
    progressText: s => `${s.horses.filter(h => h.isPlayerOwned).reduce((acc, h) => acc + h.wins, 0)}/10 勝`,
  },
  {
    id: 'ms_rating_100',
    icon: '🔥',
    nameZh: '百フ名駒',
    descZh: '培育出評分達 100 分或以上的頂級佳駟',
    tier: '金章',
    isUnlocked: s => s.horses.some(h => h.isPlayerOwned && h.rating >= 100),
    progressText: s => `最高 ${Math.max(0, ...s.horses.filter(h => h.isPlayerOwned).map(h => h.rating))} / 100 分`,
  },
  {
    id: 'ms_g1_glory',
    icon: '👑',
    nameZh: '一級賽登頂',
    descZh: '贏得任何一場國際一級賽 (G1) 或四歲經典大賽',
    tier: '白金',
    isUnlocked: s => s.horses.some(h => h.isPlayerOwned && h.trophies.length > 0),
    progressText: s => `獎盃 ${s.horses.filter(h => h.isPlayerOwned).reduce((acc, h) => acc + h.trophies.length, 0)} 座`,
  },
  {
    id: 'ms_wealth_50m',
    icon: '💎',
    nameZh: '豪門大馬主',
    descZh: '馬房流動資金突破 HK$50,000,000',
    tier: '金章',
    isUnlocked: s => s.playerFundsHKD >= 50000000,
    progressText: s => `HK$${Math.round(s.playerFundsHKD / 10000)}萬 / 5000萬`,
  },
  {
    id: 'ms_social_master',
    icon: '🤝',
    nameZh: '馬圈人脈王',
    descZh: '與至少 3 位騎師或練馬師交情/信任達 75 以上',
    tier: '銀章',
    isUnlocked: s =>
      s.jockeys.filter(j => (j.bond || 30) >= 75).length +
        s.trainers.filter(t => (t.trust || 60) >= 75).length >=
      3,
    progressText: s =>
      `${
        s.jockeys.filter(j => (j.bond || 30) >= 75).length +
        s.trainers.filter(t => (t.trust || 60) >= 75).length
      }/3 位摯友`,
  },
];
