// ==========================================
// 賽事模擬物理引擎 (Deterministic Racing Physics Engine)
// ==========================================

import { Horse } from '../types/horse';
import { Jockey } from '../types/person';
import {
  RaceDefinition,
  RaceEntry,
  RaceReplayFrame,
  RaceSimulationResult,
  HorseSimulationState,
  OfficialPlacing,
} from '../types/race';

// 隨機種子生成器 (Mulberry32) - 確保相同種子百分之百產生相同賽果
export function createRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const secInt = Math.floor(secs);
  const ms = Math.floor((secs - secInt) * 100);
  return `${mins > 0 ? `${mins}:` : ''}${secInt.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function formatMargin(diffSec: number): string {
  if (diffSec <= 0.03) return '短馬頭位';
  if (diffSec <= 0.08) return '馬頭位';
  if (diffSec <= 0.16) return '頸位';
  if (diffSec <= 0.25) return '半馬位';
  if (diffSec <= 0.35) return '3/4 馬位';
  if (diffSec <= 0.5) return '1 馬位';
  if (diffSec <= 0.75) return '1 1/4 馬位';
  if (diffSec <= 1.0) return '1 3/4 馬位';
  if (diffSec <= 1.4) return '2 1/2 馬位';
  if (diffSec <= 2.0) return '3 3/4 馬位';
  return `${(diffSec * 2.2).toFixed(1)} 馬位`;
}

export function simulateRace(
  race: RaceDefinition,
  entries: RaceEntry[],
  horseMap: Map<string, Horse>,
  jockeyMap: Map<string, Jockey>,
  seed: number = Date.now()
): RaceSimulationResult {
  const rng = createRNG(seed);
  const totalDist = race.distance;
  const isStraightOnly = race.course === 'shatin' && totalDist === 1000;
  const straightLength = race.course === 'happy_valley' ? 312 : 430;
  const straightThreshold = totalDist - straightLength;

  // 初始化各馬狀態
  let activeHorses: {
    entry: RaceEntry;
    horse: Horse;
    jockey: Jockey;
    distance: number;
    lane: number;
    speed: number;
    energy: number;
    maxEnergy: number;
    finishTime: number | null;
    isSprinting: boolean;
    isBlocked: boolean;
  }[] = entries.map((entry) => {
    let horse = horseMap.get(entry.horseId);
    if (!horse) {
      horse = {
        id: entry.horseId,
        nameZh: entry.horseNameZh,
        nameEn: entry.horseNameZh,
        gender: 'gelding',
        age: 4,
        color: '棗色',
        country: 'AUS',
        ownerId: 'ai_owner',
        ownerName: '香港馬主團體',
        trainerId: 'ai_trainer',
        trainerName: entry.trainerNameZh,
        isPlayerOwned: false,
        rating: 60,
        careerStarts: 10,
        wins: 2,
        seconds: 1,
        thirds: 1,
        totalPrizeMoney: 1000000,
        attributes: {
          speed: 76,
          stamina: 74,
          acceleration: 75,
          power: 75,
          guts: 75,
          intelligence: 75,
          temperament: 75,
          health: 85,
          flexibility: 80,
          consistency: 80,
        },
        geneticCeiling: {
          speed: 90,
          stamina: 90,
          acceleration: 90,
          power: 90,
          guts: 90,
          intelligence: 90,
          temperament: 90,
          health: 90,
          flexibility: 90,
          consistency: 90,
        },
        trainingProgress: {},
        runningStyle: entry.tactic,
        preferredSurface: race.surface,
        surfaceAffinity: { turf: 90, dirt: 70 },
        optimalDistance: { min: race.distance - 200, max: race.distance + 200 },
        maturityType: 'normal',
        fitness: 88,
        fatigue: 10,
        morale: 85,
        isInjured: false,
        injuryWeeksRemaining: 0,
        location: 'shatin',
        pedigree: { id: `ped_${entry.horseId}`, nameZh: entry.horseNameZh, nameEn: entry.horseNameZh, sireLine: 'Danehill系' },
        sireLine: 'Danehill系',
        vitality: 80,
        dramaFactor: 40,
        dramaAchievements: [],
        raceHistory: [],
        trophies: [],
        marketValue: 2000000,
        isRetired: false,
      };
      horseMap.set(entry.horseId, horse);
    }
    const jockey = jockeyMap.get(entry.jockeyId) || {
      id: 'default',
      nameZh: '騎師',
      nameEn: 'Jockey',
      avatar: '🏇',
      rating: 80,
      experience: 80,
      positioning: 80,
      paceControl: 80,
      finishing: 80,
      weightClaim: 0,
      totalRides: 100,
      totalWins: 10,
      winRate: 0.1,
      preferredTrack: 'both',
      isAvailable: true,
    };

    // 初始體力：以耐力與健康為基礎
    const maxEnergy = 80 + horse.attributes.stamina * 0.4 + (horse.fitness / 100) * 10;

    return {
      entry,
      horse,
      jockey,
      distance: 0,
      lane: Math.min(3, Math.max(0, Math.floor((entry.gate - 1) / 4))),
      speed: 0,
      energy: maxEnergy,
      maxEnergy,
      finishTime: null,
      isSprinting: false,
      isBlocked: false,
    };
  });

  const replayFrames: RaceReplayFrame[] = [];
  const commentaryLog: string[] = [];
  let currentTime = 0;
  const dt = 0.2; // 0.2秒一幀

  // 廣東話旁述事件標記
  let hasStartComment = false;
  let hasHalfwayComment = false;
  let hasStraightComment = false;
  let hasFinishComment = false;

  // 沿途走位評述事件狀態 (v2026.5.5)：快照、節流與冷卻
  interface RaceSnap {
    t: number;
    rank: Map<string, number>;
    lane: Map<string, number>;
  }
  const snapshots: RaceSnap[] = [];
  let prevLeaderId: string | null = null;
  let lastEventAt = -10;
  const horseEventCd = new Map<string, number>();
  const blockedStreak = new Map<string, number>();
  let marginWideCalled = false;
  let marginCloseCalled = false;
  const pickLine = (arr: string[]) => arr[Math.floor(rng() * arr.length)];

  // 步速判定：看領放馬匹數量
  const frontRunners = activeHorses.filter(h => h.entry.tactic === 'front_runner').length;
  const paceType: 'slow' | 'normal' | 'fast' = frontRunners >= 3 ? 'fast' : frontRunners === 0 ? 'slow' : 'normal';

  // 模擬主迴圈 (直到所有馬匹抵達終點，最多 180 秒)
  while (activeHorses.some(h => h.finishTime === null) && currentTime < 180) {
    currentTime = Math.round((currentTime + dt) * 100) / 100;

    // 計算當前排位 (以已跑距離由多至寡)
    const sortedByDist = [...activeHorses].sort((a, b) => b.distance - a.distance);

    // 旁述觸發
    let currentCommentary: string | undefined = undefined;

    if (!hasStartComment && currentTime >= 0.6) {
      hasStartComment = true;
      const leader = sortedByDist[0];
      const comment = paceType === 'fast'
        ? `賽事出閘！多匹快馬搶前，由【${leader.horse.nameZh}】在內欄搶出，步速頗快！`
        : `各駒順利出閘，【${leader.horse.nameZh}】輕鬆切入領放，步速平穩！`;
      currentCommentary = comment;
      commentaryLog.push(`[出閘] ${comment}`);
    }

    const leaderDist = sortedByDist[0].distance;

    if (!hasHalfwayComment && leaderDist >= totalDist * 0.5) {
      hasHalfwayComment = true;
      const leader = sortedByDist[0];
      const second = sortedByDist[1];
      const secondName = second ? second.horse.nameZh : '後方馬群';
      const comment = `已跑過一半途程！【${leader.horse.nameZh}】依然引領群雄，【${secondName}】緊咬在側！`;
      currentCommentary = comment;
      commentaryLog.push(`[半程] ${comment}`);
    }

    if (!hasStraightComment && leaderDist >= straightThreshold) {
      hasStraightComment = true;
      const comment = `${race.courseNameZh}轉入最後直路！各駒爭相抽出外疊發力衝刺！`;
      currentCommentary = comment;
      commentaryLog.push(`[直路] ${comment}`);
    }

    if (!hasFinishComment && leaderDist >= totalDist - 50) {
      hasFinishComment = true;
      const leader = sortedByDist[0];
      const second = sortedByDist[1];
      const margin = second ? (leader.distance - second.distance).toFixed(1) : '遙遙';
      const comment = `最後五十米！【${leader.horse.nameZh}】全速撲向終點，領先約 ${margin} 米，頂唔頂得住？！`;
      currentCommentary = comment;
      commentaryLog.push(`[衝刺] ${comment}`);
    }

    // 更新每匹馬的物理狀態
    for (const h of activeHorses) {
      if (h.finishTime !== null) continue;

      const attrs = h.horse.attributes;
      const tactic = h.entry.tactic;
      const inStraight = h.distance >= straightThreshold;

      // 1. 基準速度 (Base Speed, 15.0 ~ 17.5 m/s)
      let baseSpeed = 14.8 + (attrs.speed / 100) * 2.8;

      // 負磅懲罰 (Handicap Weight penalty: 113 to 135 lbs)
      // 基準以 122 磅為中心，每多 1 磅稍微壓低速度
      const effectiveWeight = h.entry.handicapWeight - h.jockey.weightClaim;
      const weightFactor = 1.0 - (effectiveWeight - 120) * 0.0025;
      baseSpeed *= Math.max(0.92, Math.min(1.05, weightFactor));

      // 跑道場地適應度 (Surface affinity)
      const surfaceScore = race.surface === 'dirt'
        ? h.horse.surfaceAffinity.dirt
        : h.horse.surfaceAffinity.turf;
      const surfaceFactor = 0.85 + (surfaceScore / 100) * 0.15;
      baseSpeed *= surfaceFactor;

      // 距離適應 (Optimal distance match)
      const distMin = h.horse.optimalDistance.min;
      const distMax = h.horse.optimalDistance.max;
      let distFactor = 1.0;
      if (totalDist < distMin) {
        distFactor -= ((distMin - totalDist) / 400) * 0.03;
      } else if (totalDist > distMax) {
        distFactor -= ((totalDist - distMax) / 400) * 0.04;
      }
      baseSpeed *= Math.max(0.88, distFactor);

      // 2. 戰術與階段分配 (Phase & Tactics)
      let targetSpeedMultiplier = 1.0;
      let staminaDrainRate = 1.0;

      if (!inStraight) {
        // 前半程及彎道
        if (tactic === 'front_runner') {
          targetSpeedMultiplier = 1.03;
          staminaDrainRate = 1.25;
        } else if (tactic === 'stalker') {
          targetSpeedMultiplier = 1.01;
          staminaDrainRate = 1.05;
        } else if (tactic === 'midfield') {
          targetSpeedMultiplier = 0.985;
          staminaDrainRate = 0.85;
        } else { // closer
          targetSpeedMultiplier = 0.965;
          staminaDrainRate = 0.70;
        }

        // 彎道外疊距離懲罰 (非沙田1000直路)
        if (!isStraightOnly && h.lane > 0) {
          targetSpeedMultiplier -= h.lane * 0.008; // 外疊多行路程等同降速
        }
      } else {
        // 最後直路衝刺 (Final Straight)
        h.isSprinting = true;
        const remainingDistRatio = Math.max(0, (totalDist - h.distance) / straightLength);
        const staminaFactor = Math.max(0.65, Math.min(1.15, h.energy / 40));

        // 爆發力 (Acceleration) & 鬥心 (Guts) & 騎師推騎發力 (Finishing)
        const burst = (attrs.acceleration / 100) * 0.08 + (attrs.guts / 100) * 0.06;
        const jockeyBoost = (h.jockey.finishing / 100) * 0.04;

        if (tactic === 'closer') {
          // 後上馬在直路爆炸力最強，前提是體力充沛
          targetSpeedMultiplier = (1.05 + burst + jockeyBoost) * staminaFactor;
          staminaDrainRate = 2.4;
        } else if (tactic === 'midfield') {
          targetSpeedMultiplier = (1.03 + burst * 0.9 + jockeyBoost) * staminaFactor;
          staminaDrainRate = 2.0;
        } else if (tactic === 'stalker') {
          targetSpeedMultiplier = (1.01 + burst * 0.7 + jockeyBoost) * staminaFactor;
          staminaDrainRate = 1.8;
        } else {
          // 領放馬直路主要依靠鬥心維持
          targetSpeedMultiplier = (0.99 + (attrs.guts / 100) * 0.06 + jockeyBoost) * staminaFactor;
          staminaDrainRate = 1.9;
        }
      }

      // 3. 走位與交通 (Running lines & traffic, v2026.5.4)
      // 每種跑法有偏好跑線：領放貼欄、守位二疊、後上馬直路抽出外疊發力
      const prefLane = !inStraight
        ? tactic === 'front_runner'
          ? 0
          : tactic === 'stalker'
            ? 0.5
            : tactic === 'midfield'
              ? 1
              : 1.5
        : tactic === 'closer'
          ? 2.5
          : tactic === 'midfield'
            ? 1.5
            : tactic === 'stalker'
              ? 1
              : 0.5;

      // 前方同疊最近的馬 (已衝線者不計)
      let aheadHorse: (typeof activeHorses)[number] | null = null;
      let aheadGap = Infinity;
      for (const other of activeHorses) {
        if (other === h || other.finishTime !== null) continue;
        const dd = other.distance - h.distance;
        if (dd > 0 && dd < aheadGap && Math.abs(other.lane - h.lane) < 0.55) {
          aheadHorse = other;
          aheadGap = dd;
        }
      }
      const isBlocked = !!aheadHorse && aheadGap < 2.6 && aheadHorse.speed <= h.speed + 0.05;
      h.isBlocked = isBlocked;
      if (isBlocked) {
        // 騎師走位技巧 (Positioning) 可減輕受困懲罰
        const relief = (h.jockey.positioning / 100) * 0.5;
        targetSpeedMultiplier *= 0.94 + relief * 0.04;
      }

      // 目標跑線：受困時主動找空位 (先外後內)，否則逐步移向偏好跑線
      const bandClear = (laneTarget: number, lookAhead: number) =>
        !activeHorses.some(
          (o) =>
            o !== h &&
            o.finishTime === null &&
            Math.abs(o.lane - laneTarget) < 0.55 &&
            o.distance - h.distance > -2.0 &&
            o.distance - h.distance < lookAhead
        );
      let desiredLane = h.lane;
      if (isBlocked) {
        if (bandClear(h.lane + 1, 4)) desiredLane = h.lane + 1;
        else if (h.lane >= 1 && bandClear(h.lane - 1, 4)) desiredLane = h.lane - 1;
        else desiredLane = Math.min(4, h.lane + 0.5); // 兩邊都冇位，先微微抽出
      } else if (Math.abs(prefLane - h.lane) > 0.01 && bandClear(prefLane, 3)) {
        desiredLane = prefLane;
      }
      // 跑線逐漸移動 (每幀最多 0.18 疊，不再瞬間跳疊)，橫移期間輕微耗速
      if (desiredLane !== h.lane) {
        const step =
          Math.sign(desiredLane - h.lane) * Math.min(Math.abs(desiredLane - h.lane), 0.18);
        const alongside = activeHorses.some(
          (o) =>
            o !== h &&
            o.finishTime === null &&
            Math.abs(o.lane - (h.lane + step)) < 0.5 &&
            Math.abs(o.distance - h.distance) < 2.2
        );
        if (!alongside) {
          h.lane = Math.min(4, Math.max(0, h.lane + step));
          targetSpeedMultiplier *= 0.996;
        }
      }

      // 4. 體力消耗 (Energy Consumption)
      const energyCost = 0.5 * staminaDrainRate * (1 + (attrs.power < 70 ? 0.1 : 0));
      h.energy = Math.max(0, h.energy - energyCost * dt);

      // 微小動態隨機擾動 (Micro jitter 0.985 - 1.015)
      const jitter = 0.985 + rng() * 0.03;

      const targetSpeed = baseSpeed * targetSpeedMultiplier * jitter;

      // 加速度限制 (真實物理過渡)
      if (h.speed === 0) {
        // 出閘爆發力
        h.speed = 10.0 + (attrs.acceleration / 100) * 4.0;
      } else {
        const accelLimit = (attrs.acceleration / 100) * 4.5 * dt;
        if (targetSpeed > h.speed) {
          h.speed = Math.min(targetSpeed, h.speed + accelLimit);
        } else {
          h.speed = Math.max(targetSpeed, h.speed - accelLimit * 1.5);
        }
      }

      // 前進距離更新
      const prevDist = h.distance;
      h.distance += h.speed * dt;

      // 防穿位：不可穿過前方同疊馬匹 (開跑時並排者不計)。
      // 緩衝線為前車後 1.2 米；已在緩衝區內者只凍結推進，永不倒退。
      if (aheadHorse && aheadGap > 0.35) {
        const cap = aheadHorse.distance - 1.2;
        if (h.distance > cap) {
          h.distance = Math.max(prevDist, Math.min(h.distance, cap));
          h.speed = Math.min(h.speed, aheadHorse.speed);
        }
      }

      // 檢查是否衝過終點
      if (h.distance >= totalDist) {
        // 內插計算精準過終點時間 (Exact finish time)
        const overshoot = h.distance - totalDist;
        const exactTime = currentTime - overshoot / h.speed;
        h.finishTime = Math.round(exactTime * 100) / 100;
        h.distance = totalDist;
      }
    }

    // ---- 沿途走位評述事件偵測 (更新後狀態) ----
    const sortedNow = [...activeHorses].sort((a, b) => b.distance - a.distance);
    snapshots.push({
      t: currentTime,
      rank: new Map(sortedNow.map((h, i) => [h.horse.id, i + 1])),
      lane: new Map(sortedNow.map((h) => [h.horse.id, h.lane])),
    });
    while (snapshots.length && snapshots[0].t < currentTime - 5) snapshots.shift();
    const snap3 =
      [...snapshots].reverse().find((s) => s.t <= currentTime - 2.8) || snapshots[0];
    for (const h of activeHorses) {
      blockedStreak.set(h.horse.id, h.isBlocked ? (blockedStreak.get(h.horse.id) || 0) + 1 : 0);
    }

    let eventCommentary: string | undefined = undefined;
    if (!currentCommentary && currentTime > 2 && currentTime - lastEventAt >= 1.2) {
      const leaderNow = sortedNow[0];
      const secondNow = sortedNow[1];
      const marginLen = secondNow ? (leaderNow.distance - secondNow.distance) / 2.4 : 99;
      const inStraightNow = leaderNow.distance >= straightThreshold;
      const candidates: Array<{ prio: number; text: string; horseId?: string }> = [];

      // 領先易手
      if (prevLeaderId && leaderNow.horse.id !== prevLeaderId && currentTime > 4) {
        const oldName =
          activeHorses.find((x) => x.horse.id === prevLeaderId)?.horse.nameZh || '前領馬';
        candidates.push({
          prio: 5,
          text: pickLine([
            `【${leaderNow.horse.nameZh}】已經搶過【${oldName}】，取得領先！`,
            `領先位置易手，【${leaderNow.horse.nameZh}】竄上第一位！`,
            `【${leaderNow.horse.nameZh}】力壓【${oldName}】，進佔首位！`,
          ]),
        });
      }
      // 直路步步進逼 (只報一次)
      if (inStraightNow && secondNow && marginLen < 0.7 && !marginCloseCalled) {
        marginCloseCalled = true;
        candidates.push({
          prio: 4,
          text: pickLine([
            `【${secondNow.horse.nameZh}】步步進逼，貼到上嚟喇！`,
            `頭兩名鬥到難分難解，【${secondNow.horse.nameZh}】只係落後半步！`,
          ]),
        });
      }
      // 領先擴大 (只報一次)
      if (marginLen >= 3 && !marginWideCalled && currentTime > 6) {
        marginWideCalled = true;
        candidates.push({
          prio: 1,
          text: pickLine([
            `【${leaderNow.horse.nameZh}】越跑越有，領先優勢擴大到 ${marginLen.toFixed(1)} 個馬位！`,
            `【${leaderNow.horse.nameZh}】越帶越遠，已經拋離 ${marginLen.toFixed(1)} 個馬位！`,
          ]),
        });
      }
      // 逐駒事件 (3 秒前快照對比)
      for (const h of sortedNow) {
        const id = h.horse.id;
        if ((horseEventCd.get(id) || 0) > currentTime) continue;
        const rankNow = snap3.rank.get(id) !== undefined ? sortedNow.indexOf(h) + 1 : 0;
        const rankPrev = snap3.rank.get(id);
        const lanePrev = snap3.lane.get(id);
        if (rankPrev === undefined || lanePrev === undefined || rankNow === 0) continue;
        const name = h.horse.nameZh;
        // 後上湧前
        if (rankPrev - rankNow >= 3 && rankNow <= 5) {
          candidates.push({
            prio: 3,
            horseId: id,
            text: pickLine([
              `【${name}】從後方一湧而上，已經殺上第 ${rankNow} 位！`,
              `留意【${name}】，沿途不斷上前，而家排第 ${rankNow} 位！`,
            ]),
          });
        }
        // 直路抽出外疊
        if (inStraightNow && h.lane - lanePrev >= 0.9) {
          candidates.push({
            prio: 3,
            horseId: id,
            text: pickLine([
              `【${name}】移出外疊，全力衝刺！`,
              `【${name}】在大外疊一氣衝上嚟！`,
            ]),
          });
        } else if (!inStraightNow && h.lane - lanePrev >= 0.9) {
          // 沿途抽出外疊望空
          candidates.push({
            prio: 1,
            horseId: id,
            text: `【${name}】抽出外疊，準備望空發力。`,
          });
        }
        // 力弱墮退
        if (rankPrev <= 4 && rankNow - rankPrev >= 3) {
          candidates.push({
            prio: 2,
            horseId: id,
            text: pickLine([
              `【${name}】開始力弱，墮返落第 ${rankNow} 位。`,
              `【${name}】後勁不繼，位置一路向後移。`,
            ]),
          });
        }
        // 受困冇位出 (持續受困 1 秒且在前列)
        if ((blockedStreak.get(id) || 0) >= 5 && rankNow <= 8) {
          candidates.push({
            prio: 2,
            horseId: id,
            text: pickLine([
              `【${name}】困喺馬群之中，前面冇路出！`,
              `【${name}】畀馬包圍住，想出又冇位出。`,
            ]),
          });
        }
      }

      if (candidates.length) {
        candidates.sort((a, b) => b.prio - a.prio);
        const chosen = candidates[0];
        eventCommentary = chosen.text;
        lastEventAt = currentTime;
        if (chosen.horseId) horseEventCd.set(chosen.horseId, currentTime + 9);
        // 領先易手後，同一匹馬的「湧上首位」屬同一動作，不重複報
        if (chosen.prio === 5) horseEventCd.set(leaderNow.horse.id, currentTime + 9);
        commentaryLog.push(`[走位] ${chosen.text}`);
      }
    }
    prevLeaderId = sortedNow[0]?.horse.id ?? prevLeaderId;

    // 記錄當前幀
    const frameHorses: HorseSimulationState[] = sortedByDist.map((h, idx) => ({
      horseId: h.horse.id,
      horseNameZh: h.horse.nameZh,
      gate: h.entry.gate,
      numberCloth: h.entry.numberCloth,
      silkColor: h.entry.silkColor,
      currentDistance: Math.min(totalDist, Math.round(h.distance * 10) / 10),
      lane: h.lane,
      currentSpeed: Math.round(h.speed * 10) / 10,
      currentEnergy: Math.round(h.energy * 10) / 10,
      isSprinting: h.isSprinting,
      isBlocked: h.isBlocked,
      tactic: h.entry.tactic,
      rank: idx + 1,
    }));

    replayFrames.push({
      timestamp: currentTime,
      horses: frameHorses,
      leaderId: sortedByDist[0].horse.id,
      paceType,
      commentary: currentCommentary ?? eventCommentary,
    });
  }

  // 整理正式賽果名次 (Official Placings)
  const sortedFinishers = [...activeHorses].sort((a, b) => {
    if (a.finishTime === null) return 1;
    if (b.finishTime === null) return -1;
    return a.finishTime - b.finishTime;
  });

  const winningTimeSec = sortedFinishers[0].finishTime || 70.0;
  const purse = race.purseHKD;

  // 香港賽馬會標準獎金分配比例:
  // 1st: 56%, 2nd: 21%, 3rd: 11.5%, 4th: 6%, 5th: 3.5%, 6th: 2%
  const prizeShares = [0.56, 0.21, 0.115, 0.06, 0.035, 0.02];

  const placings: OfficialPlacing[] = sortedFinishers.map((finisher, index) => {
    const placing = index + 1;
    const finishSec = finisher.finishTime || winningTimeSec + 5.0;
    const diffFromWinner = finishSec - winningTimeSec;

    let marginText = '-';
    if (placing > 1) {
      const prevFinisher = sortedFinishers[index - 1];
      const diffFromPrev = finishSec - (prevFinisher.finishTime || winningTimeSec);
      marginText = formatMargin(diffFromPrev);
    }

    // 評分調整 (Rating change)
    let ratingChange = 0;
    if (placing === 1) {
      ratingChange = diffFromWinner > 0.4 ? 7 : diffFromWinner > 0.2 ? 6 : 5;
    } else if (placing === 2) {
      ratingChange = 2;
    } else if (placing === 3) {
      ratingChange = 1;
    } else if (placing >= 7) {
      ratingChange = -1;
    } else if (placing >= 10) {
      ratingChange = -2;
    }

    const prizeMoney = index < prizeShares.length ? Math.round(purse * prizeShares[index]) : 0;

    return {
      horseId: finisher.horse.id,
      horseNameZh: finisher.horse.nameZh,
      jockeyNameZh: finisher.jockey.nameZh,
      trainerNameZh: finisher.horse.trainerName,
      placing,
      gate: finisher.entry.gate,
      weight: finisher.entry.handicapWeight - finisher.jockey.weightClaim,
      finishTimeSec: finishSec,
      finishTimeFormatted: formatTime(finishSec),
      marginText: placing === 1 ? '贏出' : marginText,
      prizeMoneyHKD: prizeMoney,
      ratingChange,
      odds: finisher.entry.currentOdds,
    };
  });

  return {
    raceId: race.id,
    raceNameZh: race.nameZh,
    raceGrade: race.grade,
    courseNameZh: race.courseNameZh,
    distance: race.distance,
    surface: race.surface,
    going: 'good',
    seed,
    winningTime: formatTime(winningTimeSec),
    placings,
    replayFrames,
    commentaryLog,
  };
}
