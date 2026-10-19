import { describe, it, expect } from 'vitest';
import { simulateRace, createRNG } from '../engine/racingEngine';
import { HK_RACES_CALENDAR } from '../data/hkRaces';
import { INITIAL_HORSES, LEGENDARY_STALLIONS } from '../data/hkHorses';
import { HK_JOCKEYS } from '../data/hkPeople';
import { generateEntriesForRace, isHorseEligibleForRace } from '../engine/aiEngine';
import { breedFoal, hasSelfAncestor } from '../engine/geneticsEngine';
import { advanceToNextWeek } from '../engine/calendarEngine';
import { createInitialState } from '../engine/gameStore';
import { Horse } from '../types/horse';

describe('Winning Post 10 2026 HK Edition - 核心模擬測試套件', () => {
  const race = HK_RACES_CALENDAR[0]; // 香港特首盃 1200m
  const horseMap = new Map(INITIAL_HORSES.map(h => [h.id, h]));
  const jockeyMap = new Map(HK_JOCKEYS.map(j => [j.id, j]));

  it('TEST 01: 相同賽事種子必須產生完全一致的確定性賽果 (Deterministic Reproduction)', () => {
    const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
    const seed = 123456789;

    const res1 = simulateRace(race, entries, horseMap, jockeyMap, seed);
    const res2 = simulateRace(race, entries, horseMap, jockeyMap, seed);

    expect(res1.winningTime).toBe(res2.winningTime);
    expect(res1.placings.length).toBe(res2.placings.length);
    expect(res1.placings[0].horseId).toBe(res2.placings[0].horseId);
    expect(res1.placings[0].finishTimeFormatted).toBe(res2.placings[0].finishTimeFormatted);
    expect(res1.replayFrames.length).toBe(res2.replayFrames.length);
  });

  it('TEST 02: 賽駒未跑畢全賽程不得過終點 (Distance completion integrity)', () => {
    const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
    const res = simulateRace(race, entries, horseMap, jockeyMap, 98765);

    for (const frame of res.replayFrames) {
      for (const h of frame.horses) {
        expect(h.currentDistance).toBeLessThanOrEqual(race.distance);
      }
    }

    const lastFrame = res.replayFrames[res.replayFrames.length - 1];
    expect(lastFrame.horses[0].currentDistance).toBe(race.distance);
  });

  it('TEST 03: 同一騎師不可在同一場賽事中分身策騎兩匹馬 (No Jockey Conflict)', () => {
    const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
    const jockeyIds = entries.map(e => e.jockeyId);
    const uniqueIds = new Set(jockeyIds);
    expect(jockeyIds.length).toBe(uniqueIds.size);
  });

  it('TEST 04: 未達條件資格之賽駒不得報名參賽 (Ineligible race entry prevention)', () => {
    const lowRatingHorse: Horse = {
      ...INITIAL_HORSES[0],
      rating: 35, // 只有35分
    };
    // 特首盃需要 85-115分
    const check = isHorseEligibleForRace(lowRatingHorse, race);
    expect(check.eligible).toBe(false);
  });

  it('TEST 05: 傷患賽駒於醫療期內禁止出賽 (Injured horse blocked from racing)', () => {
    const injuredHorse: Horse = {
      ...INITIAL_HORSES[0],
      rating: 90,
      isInjured: true,
      injuryWeeksRemaining: 3,
    };
    const check = isHorseEligibleForRace(injuredHorse, race);
    expect(check.eligible).toBe(false);
    expect(check.reason).toContain('傷患');
  });

  it('TEST 06: 賽事總獎金正確分發，首名獎金依比例分發 (Prize distribution)', () => {
    const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
    const res = simulateRace(race, entries, horseMap, jockeyMap, 555);

    expect(res.placings[0].prizeMoneyHKD).toBeGreaterThan(0);
    // 香港冠軍約獲 56%
    const expectedFirst = Math.round(race.purseHKD * 0.56);
    expect(res.placings[0].prizeMoneyHKD).toBe(expectedFirst);
  });

  it('TEST 07: 賽駒不可將自身視為祖先 (No self ancestor recursion)', () => {
    const horse = INITIAL_HORSES[0];
    const isSelf = hasSelfAncestor(horse.pedigree, horse.pedigree.id);
    expect(isSelf).toBe(false);
  });

  it('TEST 08: 配種禁止自身同體繁殖 (Relationship restriction enforcement)', () => {
    const horse = INITIAL_HORSES[0];
    expect(() => {
      breedFoal(horse, horse, '測試馬', 'Test Foal', 'p', 'p');
    }).toThrow();
  });

  it('TEST 10: 跨季推進一年，賽駒年齡正確增長 (Season year advancement)', () => {
    let state = createInitialState();
    state.currentCalendar.week = 48; // 季尾煞科
    const nextState = advanceToNextWeek(state);

    expect(nextState.currentCalendar.week).toBe(1);
    expect(nextState.currentCalendar.year).toBe(2027);
    expect(nextState.horses[0].age).toBe(INITIAL_HORSES[0].age + 1);
  });

  it('TEST 11 & 12: 存檔序列化與反序列化完整保存屬性與血統 (Save/load integrity)', () => {
    const state = createInitialState();
    const json = JSON.stringify(state);
    const loaded = JSON.parse(json);

    expect(loaded.playerFundsHKD).toBe(state.playerFundsHKD);
    expect(loaded.horses.length).toBe(state.horses.length);
    expect(loaded.horses[0].pedigree.sireLine).toBe(state.horses[0].pedigree.sireLine);
    expect(loaded.horses[0].attributes.speed).toBe(state.horses[0].attributes.speed);
  });

  it('TEST 13: 多代繁育血脈延續無崩潰 (Multi-generational breeding continuity)', () => {
    const stallion = LEGENDARY_STALLIONS[0]; // 金鎗六十
    const broodmare = INITIAL_HORSES[1]; // 駿逸千金

    const gen1 = breedFoal(stallion, broodmare, '千金一鎗', 'Golden Noble', 'player', '傲翔馬房');
    expect(gen1.age).toBe(2);
    expect(gen1.rating).toBe(52);
    expect(gen1.pedigree.sire?.nameZh).toBe('金鎗六十');

    // 世代2
    const gen2 = breedFoal(stallion, gen1, '二代金鎗', 'Golden Legacy', 'player', '傲翔馬房');
    expect(gen2.pedigree.sire?.nameZh).toBe('金鎗六十');
    expect(gen2.pedigree.dam?.nameZh).toBe('千金一鎗');
  });

  it('TEST 15: 能力值顯著優勢的賽駒在長期模擬中體現勝率優勢 (Ability reflects outcome)', () => {
    // 駿逸千金 (能力82，三班頂級) vs 幸運常來 (能力65) 在公開平磅賽中對決
    const strongHorse = INITIAL_HORSES.find(h => h.nameZh === '駿逸千金')!;
    const weakHorse = INITIAL_HORSES.find(h => h.nameZh === '幸運常來')!;

    const testEntries: typeof race extends any ? any : any = [
      {
        horseId: strongHorse.id,
        horseNameZh: strongHorse.nameZh,
        jockeyId: HK_JOCKEYS[0].id,
        jockeyNameZh: HK_JOCKEYS[0].nameZh,
        trainerNameZh: strongHorse.trainerName,
        tactic: strongHorse.runningStyle,
        gate: 1,
        handicapWeight: 126,
        silkColor: '#ff0000',
        numberCloth: 1,
        currentOdds: 1.5,
      },
      {
        horseId: weakHorse.id,
        horseNameZh: weakHorse.nameZh,
        jockeyId: HK_JOCKEYS[1].id,
        jockeyNameZh: HK_JOCKEYS[1].nameZh,
        trainerNameZh: weakHorse.trainerName,
        tactic: weakHorse.runningStyle,
        gate: 2,
        handicapWeight: 126,
        silkColor: '#00ff00',
        numberCloth: 2,
        currentOdds: 15.0,
      }
    ];

    let strongWins = 0;
    for (let s = 1; s <= 10; s++) {
      const res = simulateRace(race, testEntries, horseMap, jockeyMap, s * 100);
      if (res.placings[0].horseNameZh === '駿逸千金') {
        strongWins++;
      }
    }

    expect(strongWins).toBeGreaterThanOrEqual(9);
  });

  it('TEST 13: 沙田日賽固定 11 場，跑馬地夜賽固定 9 場，全季 48 周無漏場 (11/9 Meeting Structure)', () => {
    for (let w = 1; w <= 48; w++) {
      const racesInWeek = HK_RACES_CALENDAR.filter(r => r.week === w);
      const isShaTin = racesInWeek[0].course === 'shatin';
      const expectedCount = isShaTin ? 11 : 9;

      expect(racesInWeek.length).toBe(expectedCount);

      // 檢查場次編號連續性 (第 1 場 至 第 11/9 場)
      const raceNumbers = racesInWeek.map(r => r.raceNumber).sort((a, b) => (a || 0) - (b || 0));
      for (let i = 1; i <= expectedCount; i++) {
        expect(raceNumbers[i - 1]).toBe(i);
      }
    }
  });

  it('TEST 14: 第三班賽駒 (評分 60-80 分) 在任何一周均有常規讓賽可供報名 (Class 3 Availability)', () => {
    const class3Horse: Horse = {
      ...INITIAL_HORSES[0],
      rating: 68,
      age: 4,
    };

    for (let w = 1; w <= 48; w++) {
      const racesInWeek = HK_RACES_CALENDAR.filter(r => r.week === w);
      const eligibleRaces = racesInWeek.filter(r => isHorseEligibleForRace(class3Horse, r).eligible);
      expect(eligibleRaces.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('TEST 15: 第 11 周沙田賽日包含 11 場賽事且包含二班、三班、四班讓賽 (Week 11 Card)', () => {
    const w11Races = HK_RACES_CALENDAR.filter(r => r.week === 11);
    expect(w11Races.length).toBe(11);

    // 包含 3 項國際二級賽 (馬會短途錦標 R7, 馬會一哩錦標 R8, 馬會盃 R9)
    const g2Races = w11Races.filter(r => r.grade === 'G2');
    expect(g2Races.length).toBe(3);

    // 包含常規讓賽讓三班馬 (60-80分) 參賽
    const class3Races = w11Races.filter(r => r.grade === 'CLASS_3');
    expect(class3Races.length).toBeGreaterThanOrEqual(2);
  });

  it('TEST 16: 一馬一日限跑一場 (One horse cannot join more than 1 race per day/week)', () => {
    const testHorse: Horse = { ...INITIAL_HORSES[0], rating: 90, age: 4 };
    const race1 = HK_RACES_CALENDAR.find(r => r.week === 1 && r.raceNumber === 1)!;
    const race11 = HK_RACES_CALENDAR.find(r => r.week === 1 && r.raceNumber === 11)!;

    // 情況 A：尚未報名任何賽事，應可正常報名 Race 1 (評分 85-115 分)
    const elig1 = isHorseEligibleForRace(testHorse, race1, {
      activeRaceEntries: {},
      completedRaceIdsForWeek: [],
      currentWeek: 1,
    });
    expect(elig1.eligible).toBe(true);

    // 情況 B：已在 Race 1 排位報名中，嘗試再報名 Race 11 (評分 80-100 分) 應被阻止，並回傳衝突場次 ID
    const elig2Conflict = isHorseEligibleForRace(testHorse, race11, {
      activeRaceEntries: { [race1.id]: [testHorse.id] },
      completedRaceIdsForWeek: [],
      currentWeek: 1,
    });
    expect(elig2Conflict.eligible).toBe(false);
    expect(elig2Conflict.alreadyEnteredRaceId).toBe(race1.id);
    expect(elig2Conflict.reason).toContain('已報名角逐');

    // 情況 C：今日已在 Race 1 出賽完畢 (記錄在 raceHistory 中)，不可再報名 Race 11
    const horseFinishedRace: Horse = {
      ...testHorse,
      raceHistory: [
        {
          year: 2026,
          week: 1,
          raceName: race1.nameZh,
          raceClass: race1.grade,
          track: race1.courseNameZh,
          distance: race1.distance,
          placing: 2,
          fieldSize: 14,
          weight: 126,
          margin: '1/2',
          jockeyName: '潘頓',
          time: '1:09.12',
          prizeMoney: 100000,
          ratingChange: 2,
        },
      ],
    };
    const elig3Finished = isHorseEligibleForRace(horseFinishedRace, race11, {
      activeRaceEntries: {},
      completedRaceIdsForWeek: [race1.id],
      currentWeek: 1,
      currentYear: 2026,
    });
    expect(elig3Finished.eligible).toBe(false);
    expect(elig3Finished.reason).toContain('本日已出賽');
  });

  it('TEST 17: 同一賽日 11 場賽事之所有 AI 參賽馬匹 100% 獨立不重名 (Distinct AI Competitors Across Same-Day Races)', () => {
    const w1Races = HK_RACES_CALENDAR.filter(r => r.week === 1).sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
    expect(w1Races.length).toBe(11);

    const allHorseIdsInDay = new Set<string>();
    const allHorseNamesInDay = new Set<string>();
    let totalEntries = 0;

    for (const r of w1Races) {
      const entries = generateEntriesForRace(r, INITIAL_HORSES, HK_JOCKEYS, undefined, allHorseIdsInDay);
      expect(entries.length).toBeGreaterThanOrEqual(12);

      for (const entry of entries) {
        totalEntries++;
        // 驗證同日內無任何馬匹重複出賽 (ID 與馬名均唯一)
        expect(allHorseIdsInDay.has(entry.horseId)).toBe(false);
        expect(allHorseNamesInDay.has(entry.horseNameZh)).toBe(false);

        allHorseIdsInDay.add(entry.horseId);
        allHorseNamesInDay.add(entry.horseNameZh);
      }
    }

    // 全日 11 場賽事，總出賽馬匹數超過 130 匹，全部獨立互不重複
    expect(totalEntries).toBeGreaterThanOrEqual(132);
    expect(allHorseIdsInDay.size).toBe(totalEntries);
    expect(allHorseNamesInDay.size).toBe(totalEntries);
  });

  it('TEST 18: 賽後詳細戰術檢討、練馬師評語與競賽小組報告生成 (Post-Race Tactical Review & Stewards Report)', async () => {
    const { generateTacticalReview, getStableMomentum, evaluateTrackworkChallenge, TRACKWORK_CHALLENGES } = await import('../engine/gameplayUpgradeEngine');
    const race = HK_RACES_CALENDAR[0];
    const horseMap = new Map(INITIAL_HORSES.map(h => [h.id, h]));
    const jockeyMap = new Map(HK_JOCKEYS.map(j => [j.id, j]));
    const entries = generateEntriesForRace(race, INITIAL_HORSES, HK_JOCKEYS);
    const simResult = simulateRace(race, entries, horseMap, jockeyMap, 777);

    const playerHorse = INITIAL_HORSES[0];
    const review = generateTacticalReview(race, simResult.placings, simResult.replayFrames, playerHorse, HK_JOCKEYS[0]);

    expect(review.factors.length).toBeGreaterThanOrEqual(4);
    expect(review.trainerQuote.length).toBeGreaterThan(5);
    expect(review.stewardsReport).toContain('競賽小組報告');

    // 驗證馬房手風走勢
    const hotMomentum = getStableMomentum([1, 2, 1, 1, 3]);
    expect(hotMomentum.code).toBe('hot');
    expect(hotMomentum.badgeZh).toContain('手風極順');

    const slumpMomentum = getStableMomentum([6, 8, 9, 7, 10]);
    expect(slumpMomentum.code).toBe('slump');
    expect(slumpMomentum.badgeZh).toContain('頭馬荒');

    // 驗證今日晨操試蹄考驗
    const ch = TRACKWORK_CHALLENGES[0];
    const evalS = evaluateTrackworkChallenge(ch, ch.optimalChoiceId, playerHorse);
    expect(evalS.grade).toBe('S');
    expect(evalS.compatibilityBonus).toBe(8);
  });
});


