// ==========================================
// 日程進程與馬季結算引擎 (Calendar & Season Progression Engine)
// ==========================================

import { GameState, GameCalendarWeek } from '../types/game';
import { HK_RACES_CALENDAR, getMeetingInfo } from '../data/hkRaces';
import { processWeeklyRecovery } from './trainingEngine';
import { FinancialTransaction } from '../types/facility';
import { pickWeeklyEvent, generateSeasonCeremony } from './gameplayUpgradeEngine';

export function getRacesForWeek(week: number) {
  return HK_RACES_CALENDAR
    .filter(r => r.week === week)
    .sort((a, b) => (a.raceNumber || 0) - (b.raceNumber || 0));
}

// 推進至下一周 (Advance to Next Week)
export function advanceToNextWeek(state: GameState): GameState {
  const nextLogs: string[] = [];
  let { year, week } = state.currentCalendar;

  week += 1;
  let isNewSeason = false;
  let ceremony = state.seasonCeremony || null;

  // 48 周為一個完整馬季
  if (week > 48) {
    ceremony = generateSeasonCeremony(state);
    week = 1;
    year += 1;
    isNewSeason = true;
    nextLogs.push(`🏆【${year - 1}/${year} 馬季圓滿煞科】香港冠軍人馬獎頒獎禮隆重舉行！新馬季正式開鑼！`);
  }

  const seasonString = `${year}/${year + 1} 馬季`;

  // 1. 馬匹每周自然恢復、消疲勞、康復判定
  const updatedHorses = state.horses.map(h => {
    const clone = { ...h };
    const recLog = processWeeklyRecovery(clone, state.facilities);
    if (recLog && clone.isPlayerOwned) {
      nextLogs.push(recLog);
    }

    // 若新賽季，年齡 +1 (TEST 10)
    if (isNewSeason) {
      clone.age += 1;
      // 9歲以上或評分過低退役檢測
      if (clone.age >= 9 && !clone.isRetired) {
        if (!clone.isPlayerOwned || clone.rating < 60) {
          clone.isRetired = true;
          clone.location = 'pasture';
          if (clone.isPlayerOwned) {
            nextLogs.push(`🎖️【${clone.nameZh}】年滿 9 歲，光榮告別競賽生涯退役安享晚年！`);
          }
        }
      }
    }

    return clone;
  });

  // 2. 扣除每周設施運營維護費與馬房養馬費 (每周每匹馬約 HK$15,000)
  const playerHorsesCount = updatedHorses.filter(h => h.isPlayerOwned && !h.isRetired).length;
  const stableUpkeepHKD = playerHorsesCount * 15000;

  let totalFacilityMaintHKD = 0;
  for (const fac of state.facilities) {
    totalFacilityMaintHKD += fac.maintenanceWeeklyHKD * fac.level;
  }

  const totalWeeklyExpense = stableUpkeepHKD + totalFacilityMaintHKD;
  const newFunds = state.playerFundsHKD - totalWeeklyExpense;

  const newTransactions: FinancialTransaction[] = [...state.transactions];

  if (totalWeeklyExpense > 0) {
    newTransactions.unshift({
      id: `tx_${Date.now()}_upkeep`,
      year,
      week,
      type: 'stable_upkeep',
      amountHKD: -totalWeeklyExpense,
      descriptionZh: `第 ${week} 周馬房日常營運費 (養馬費 HK$${stableUpkeepHKD.toLocaleString()} + 設施維護 HK$${totalFacilityMaintHKD.toLocaleString()})`,
      timestamp: new Date().toISOString(),
    });
  }

  // 3. 獲取下一周預定賽事
  const upcomingRaces = getRacesForWeek(week);
  const meetingInfo = getMeetingInfo(week);

  const nextCalendar: GameCalendarWeek = {
    year,
    season: seasonString,
    week,
    isRaceWeekend: upcomingRaces.length > 0,
    meetingLocation: meetingInfo.course,
    meetingType: meetingInfo.meetingType,
  };

  if (upcomingRaces.length > 0) {
    nextLogs.push(`📅 本周進行【${meetingInfo.titleZh}】，共安排 ${upcomingRaces.length} 場精彩賽事！`);
  } else {
    nextLogs.push(`☀️ 本周為常規調整周，可集中進行晨操試閘或從化溫泉調教。`);
  }

  const triggeredEvent = pickWeeklyEvent(week, year);

  return {
    ...state,
    playerFundsHKD: newFunds,
    currentCalendar: nextCalendar,
    horses: updatedHorses,
    transactions: newTransactions,
    scheduledRaces: upcomingRaces,
    activeRaceEntries: {},
    activeEntryJockeys: {},
    currentActiveRaceIndex: 0,
    currentSimulationResult: null,
    completedRaceIdsForWeek: [],
    weeklyResults: {},
    weeklyLogs: nextLogs,
    activeEvent: triggeredEvent,
    seasonCeremony: ceremony,
    currentView: 'dashboard',
  };
}

