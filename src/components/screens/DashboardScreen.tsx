import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Horse } from '../../types/horse';
import { RaceSimulationResult } from '../../types/race';
import { HorseDetailModal } from './HorseDetailModal';
import { RaceResultModal } from './RaceResultModal';
import { isHorseEligibleForRace } from '../../engine/aiEngine';
import { getStableMomentum, generateNewspaperEdition } from '../../engine/gameplayUpgradeEngine';
import { getObjectiveProgress } from '../../engine/seasonObjectives';
import {
  Trophy,
  Calendar,
  Coins,
  Shield,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  Play,
  Dumbbell,
  Dna,
  ShoppingBag,
  CheckCircle,
  Newspaper,
  Award,
} from 'lucide-react';

export const DashboardScreen: React.FC = () => {
  const {
    state,
    setView,
    runRaceSimulation,
    viewRaceReplay,
    withdrawRaceEntry,
    resolveEventChoice,
    triggerManualEvent,
    completeSeasonCeremony,
    triggerManualCeremony,
    issueTacticalCommand,
    claimObjectiveReward,
    pendingPlayerRaces,
    runNextPlayerRace,
  } = useGame();

  // ===== v2026.3: 賽季目標 + 下一步建議 (由現有狀態即時推導) =====
  const objectiveProgress = getObjectiveProgress(state);
  const claimableCount = objectiveProgress.filter(o => o.complete && !o.claimed).length;

  const nextSteps: { icon: string; text: string; actionLabel: string; view: Parameters<typeof setView>[0] }[] = [];
  {
    const myActive = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);
    const enteredThisWeek = Object.values(state.activeRaceEntries || {}).some(ids => ids.length > 0);
    const tiredHorse = myActive.find(h => (h.fatigue ?? 0) >= 70);
    const unfitHorse = myActive.find(h => (h.fitness ?? 100) < 70 && (h.fatigue ?? 0) < 70);
    const trialPending = myActive.find(
      h => (state.trackworkTrialDoneWeek || {})[h.id] !== state.currentCalendar.week
    );
    const cheapestFacility = [...state.facilities]
      .filter(f => f.level < f.maxLevel)
      .sort((a, b) => a.costHKD - b.costHKD)[0];

    if (claimableCount > 0) {
      nextSteps.push({
        icon: '🎯',
        text: `有 ${claimableCount} 個賽季目標已完成，快啲領獎`,
        actionLabel: '睇目標',
        view: 'dashboard',
      });
    }
    if (!enteredThisWeek) {
      nextSteps.push({
        icon: '📋',
        text: '今周仲未有馬報名出賽，去賽程揀場合適賽事',
        actionLabel: '去賽程',
        view: 'calendar',
      });
    }
    if (tiredHorse) {
      nextSteps.push({
        icon: '😴',
        text: `【${tiredHorse.nameZh}】疲勞已達 ${Math.round(tiredHorse.fatigue)}%，出賽前先休息或做水療`,
        actionLabel: '去調教',
        view: 'training',
      });
    } else if (unfitHorse) {
      nextSteps.push({
        icon: '🏃',
        text: `【${unfitHorse.nameZh}】狀態得 ${Math.round(unfitHorse.fitness)}%，操返起先出賽`,
        actionLabel: '去調教',
        view: 'training',
      });
    }
    if (trialPending) {
      nextSteps.push({
        icon: '🏇',
        text: `【${trialPending.nameZh}】今周未做晨操試蹄考驗，做咗可提升人馬合拍度`,
        actionLabel: '去晨操',
        view: 'training',
      });
    }
    if (cheapestFacility && state.playerFundsHKD >= cheapestFacility.costHKD) {
      nextSteps.push({
        icon: '🏗️',
        text: `資金足够升級【${cheapestFacility.nameZh}】(HK$${cheapestFacility.costHKD.toLocaleString()})`,
        actionLabel: '去基地',
        view: 'facilities',
      });
    }
    if (nextSteps.length === 0) {
      nextSteps.push({
        icon: '✅',
        text: '今周準備功夫做齊，㩒推進周次去比賽日',
        actionLabel: '睇賽程',
        view: 'calendar',
      });
    }
  }
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [selectedResultForModal, setSelectedResultForModal] = useState<RaceSimulationResult | null>(null);

  const momentum = getStableMomentum(state.recentPlacings || [2, 1, 3]);
  const newspaper = generateNewspaperEdition(state);

  const eligContext = {
    activeRaceEntries: state.activeRaceEntries,
    completedRaceIdsForWeek: state.completedRaceIdsForWeek,
    weeklyResults: state.weeklyResults,
    currentWeek: state.currentCalendar.week,
    currentYear: state.currentCalendar.year,
    scheduledRaces: state.scheduledRaces,
  };

  const playerHorses = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);
  const topRatedPlayerHorse = [...playerHorses].sort((a, b) => b.rating - a.rating)[0];
  const upcomingRaces = state.scheduledRaces;

  return (
    <div className="space-y-6 pb-12">
      {/* 接返進度：本周已報名未出賽 */}
      {pendingPlayerRaces.length > 0 && (
        <div className="rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏁</span>
            <div>
              <div className="text-sm font-black text-amber-200">
                你有 {pendingPlayerRaces.length} 場已報名賽事未跑
              </div>
              <div className="text-xs text-slate-300">
                {pendingPlayerRaces
                  .map(r => {
                    const names = (state.activeRaceEntries[r.id] || [])
                      .map(id => state.horses.find(h => h.id === id)?.nameZh)
                      .filter(Boolean)
                      .join('、');
                    return `${r.nameZh}（${names}）`;
                  })
                  .join(' • ')}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">推進下一周前未跑嘅會自動快速出賽</div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => runNextPlayerRace()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>開始賽馬日</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700"
            >
              去賽程
            </button>
          </div>
        </div>
      )}

      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 border border-slate-800 p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 香港賽馬殿堂之路
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/40">
                {momentum.badgeZh}
              </span>
              <span className="text-xs text-slate-400">
                {state.currentCalendar.season} • 第 {state.currentCalendar.week} 周 • 馬房聲望 {state.stableReputation || 58}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              歡迎回到 <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">{state.playerStableName}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {momentum.descZh}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView('calendar')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>查看本周賽程</span>
            </button>
            <button
              onClick={() => setView('training')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm border border-slate-700 transition flex items-center gap-2"
            >
              <Dumbbell className="w-4 h-4 text-violet-400" />
              <span>今日晨操試蹄</span>
            </button>
            <button
              onClick={triggerManualEvent}
              className="px-3.5 py-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/70 text-amber-300 font-bold text-xs border border-amber-500/40 transition flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>馬圈突發事件</span>
            </button>
            <button
              onClick={triggerManualCeremony}
              className="px-3.5 py-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/70 text-purple-300 font-bold text-xs border border-purple-500/40 transition flex items-center gap-1.5"
            >
              <Award className="w-3.5 h-3.5" />
              <span>冠軍人馬獎禮</span>
            </button>
          </div>
        </div>
      </div>

      {/* 《馬圈日報》香港版頭條報紙看板 (HK Racing Post Frontpage) */}
      <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black tracking-widest uppercase text-amber-300">
              《馬圈日報・香港版》HK RACING POST
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{newspaper.dateLabel}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
          <div className="lg:col-span-2 space-y-1.5 border-b lg:border-b-0 lg:border-r border-slate-800 pb-3 lg:pb-0 lg:pr-4">
            <div className="inline-block px-2 py-0.5 rounded bg-red-600/90 text-white text-[10px] font-black">
              頭條焦點
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-snug">
              {newspaper.headlineTitle}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {newspaper.headlineBody}
            </p>
          </div>

          <div className="space-y-2">
            {newspaper.sideStories.map((st, idx) => (
              <div key={idx} className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-xs flex items-start gap-2">
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] shrink-0">
                  {st.tag}
                </span>
                <span className="text-slate-300 leading-snug">{st.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Horses */}
        <div
          onClick={() => setView('my_horses')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">現役賽駒陣容</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 group-hover:text-amber-300 transition">
            {playerHorses.length} <span className="text-xs font-normal text-slate-400">匹</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>沙田 / 從化基地</span>
            <span className="text-amber-400 group-hover:translate-x-1 transition">檢視全部 →</span>
          </div>
        </div>

        {/* Card 2: Stable Star */}
        <div
          onClick={() => topRatedPlayerHorse && setSelectedHorse(topRatedPlayerHorse)}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">馬房鎮房名駒</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-white mt-2 truncate group-hover:text-amber-300 transition">
            {topRatedPlayerHorse ? topRatedPlayerHorse.nameZh : '尚未登記'}
          </div>
          <div className="text-[11px] text-amber-300 font-bold mt-1 flex items-center justify-between">
            <span>評分：{topRatedPlayerHorse ? `${topRatedPlayerHorse.rating} 分` : '-'}</span>
            <span className="text-slate-400 text-[10px]">詳細檔案 →</span>
          </div>
        </div>

        {/* Card 3: Weekend Races */}
        <div
          onClick={() => setView('calendar')}
          className="bg-slate-900/80 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 cursor-pointer transition shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">本周賽事安排</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white mt-2 group-hover:text-sky-300 transition">
            {upcomingRaces.length} <span className="text-xs font-normal text-slate-400">場排位</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{state.currentCalendar.meetingLocation === 'happy_valley' ? '快活谷夜賽 (9場)' : '沙田日賽 (11場)'}</span>
            <span className="text-sky-400 group-hover:translate-x-1 transition">報名出賽 →</span>
          </div>
        </div>

        {/* Card 4: Funds */}
        <div
          onClick={() => setView('finances')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 cursor-pointer transition shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">可用流動資金</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-2 truncate">
            HK${(state.playerFundsHKD / 10000).toFixed(0)}萬
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>可投資設施與配種</span>
            <span className="text-emerald-400 group-hover:translate-x-1 transition">財務流水 →</span>
          </div>
        </div>
      </div>

      {/* ===== v2026.3: 賽季目標 + 下一步建議 ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-wrap gap-2">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              🎯 賽季目標 (Season Objectives)
              {claimableCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black">
                  {claimableCount} 個可領獎
                </span>
              )}
            </h3>
            <span className="text-[11px] text-slate-400">
              已領 {(state.claimedObjectiveIds || []).length} / {objectiveProgress.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {objectiveProgress.map(({ def, current, ratio, complete, claimed }) => (
              <div
                key={def.id}
                className={`rounded-xl border p-3.5 ${
                  claimed
                    ? 'bg-emerald-950/30 border-emerald-800/60'
                    : complete
                      ? 'bg-amber-950/40 border-amber-500/50'
                      : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-white">{def.titleZh}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{def.descZh}</div>
                  </div>
                  {claimed ? (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold shrink-0">✓ 已領獎</span>
                  ) : complete ? (
                    <button
                      onClick={() => claimObjectiveReward(def.id)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shrink-0 active:scale-95 transition"
                    >
                      領獎 HK${(def.rewardFundsHKD / 10000).toFixed(0)}萬
                    </button>
                  ) : (
                    <span className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold shrink-0">
                      {def.formatValue(current)} / {def.formatValue(def.target)}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2.5">
                  <div
                    className={`h-full rounded-full ${claimed ? 'bg-emerald-500' : complete ? 'bg-amber-400' : 'bg-sky-500'}`}
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5">
                  獎勵: HK${def.rewardFundsHKD.toLocaleString()} + 聲望 {def.rewardReputation}
                  {complete && !claimed ? ' ・ 已完成，㩒領獎入賬' : ''}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-bold text-white pb-3 border-b border-slate-800 mb-4">
            🧭 下一步建議 (Next Steps)
          </h3>
          <div className="space-y-2.5">
            {nextSteps.slice(0, 4).map((step, idx) => (
              <div key={idx} className="flex items-start gap-2.5 bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                <span className="text-base shrink-0">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 leading-snug">{step.text}</p>
                  <button
                    onClick={() => setView(step.view)}
                    className="mt-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300"
                  >
                    {step.actionLabel} →
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-3 leading-relaxed">
            建議按你馬房現況即時計算: 報名、疲勞、狀態、晨操、設施同目標領獎，每周都會變。
          </p>
        </div>
      </div>

      {/* Main Two Columns: Upcoming Races & Stable Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upcoming Races Card */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">本周賽事看板 (Upcoming Races)</h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-bold border border-slate-700">
                {state.currentCalendar.meetingLocation === 'happy_valley' ? '跑馬地周三夜賽 • 共 9 場' : '沙田週末日賽 • 共 11 場'}
              </span>
            </div>
            <button
              onClick={() => setView('calendar')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold"
            >
              完整賽事排位表 ({upcomingRaces.length}場) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingRaces.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs bg-slate-950/40 rounded-xl border border-slate-800">
              本周為非賽事休整期，建議為全體賽駒安排晨操快跳、游水或從化溫泉休養。
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingRaces.map((race) => {
                const isCompleted = state.completedRaceIdsForWeek?.includes(race.id);
                const result = state.weeklyResults?.[race.id];
                const playerEnteredHorses = state.activeRaceEntries[race.id] || [];
                const playerPlacing = result?.placings.find(p => {
                  const h = state.horses.find(horse => horse.id === p.horseId);
                  return h?.isPlayerOwned;
                });
                const eligiblePlayerHorses = playerHorses.filter(h => isHorseEligibleForRace(h, race, eligContext).eligible);
                const canPlayerEnter = eligiblePlayerHorses.length > 0;
                const cleanedNameZh = race.nameZh.replace(/^第\d+場:\s*/, '');

                return (
                  <div
                    key={race.id}
                    className={`border rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition ${
                      isCompleted
                        ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/50'
                        : playerEnteredHorses.length > 0
                        ? 'bg-slate-950/90 border-emerald-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs px-2 py-0.5 rounded font-black bg-amber-500 text-slate-950 shadow-sm shrink-0">
                          第 {race.raceNumber || 1} 場
                        </span>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          race.grade === 'G1' ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40' :
                          race.grade === 'G2' || race.grade === 'G3' ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-500/40' :
                          race.grade === 'CLASSIC_4YO' ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40' :
                          race.grade === 'CLASS_1' ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                          race.grade === 'CLASS_2' ? 'bg-orange-900/50 text-orange-300 border border-orange-500/30' :
                          race.grade === 'CLASS_3' ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30' :
                          race.grade === 'CLASS_4' ? 'bg-teal-900/50 text-teal-300 border border-teal-500/30' :
                          race.grade === 'CLASS_5' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {race.grade === 'CLASSIC_4YO' ? '四歲經典系列' :
                           race.grade === 'CLASS_1' ? '第一班' :
                           race.grade === 'CLASS_2' ? '第二班' :
                           race.grade === 'CLASS_3' ? '第三班' :
                           race.grade === 'CLASS_4' ? '第四班' :
                           race.grade === 'CLASS_5' ? '第五班' : race.grade}
                        </span>

                        {canPlayerEnter && playerEnteredHorses.length === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" /> 可報名
                          </span>
                        )}

                        {isCompleted && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> 已完賽
                          </span>
                        )}

                        <h4 className="text-sm font-extrabold text-white">
                          {cleanedNameZh}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>{race.courseNameZh}</span>
                        <span>•</span>
                        <span>{race.distance} 米</span>
                        <span>•</span>
                        <span className="text-amber-300 font-semibold">總獎金 HK${(race.purseHKD).toLocaleString()}</span>
                      </div>

                      {/* 完賽結果概要 (Winner & Player Placing) */}
                      {isCompleted && result && (
                        <div className="mt-2 text-xs bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="font-bold text-amber-300">
                              🏆 頭馬：【{result.placings[0]?.horseNameZh}】
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">
                              時間：{result.winningTime}
                            </span>
                          </div>
                          {playerPlacing && (
                            <div className="text-[11px] text-emerald-400 font-semibold flex items-center justify-between">
                              <span>
                                🎯 你的賽駒【{playerPlacing.horseNameZh}】跑獲 第 {playerPlacing.placing} 名
                              </span>
                              {playerPlacing.prizeMoneyHKD > 0 && (
                                <span className="text-amber-300 font-mono">
                                  +HK${Math.round(playerPlacing.prizeMoneyHKD * 0.7).toLocaleString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 操作按鈕區 */}
                    {isCompleted && result ? (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => setSelectedResultForModal(result)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 font-bold text-xs transition flex items-center gap-1 shadow"
                        >
                          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>賽果報告</span>
                        </button>
                        <button
                          onClick={() => viewRaceReplay(result)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>重溫</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {playerEnteredHorses.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {playerEnteredHorses.map(hid => {
                              const h = state.horses.find(horse => horse.id === hid);
                              return (
                                <span key={hid} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1.5">
                                  <span>已報名：【{h?.nameZh || '名下馬'}】</span>
                                  <button
                                    onClick={() => withdrawRaceEntry(race.id, hid)}
                                    className="text-emerald-400 hover:text-rose-400 font-bold ml-1 text-xs"
                                    title="退出此場報名"
                                  >
                                    ✕ 退出
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        ) : canPlayerEnter ? (
                          <button
                            onClick={() => setView('calendar')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow"
                          >
                            立即報名
                          </button>
                        ) : (
                          <button
                            onClick={() => setView('calendar')}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
                          >
                            前往報名
                          </button>
                        )}

                        <button
                          onClick={() => {
                            runRaceSimulation(race.id);
                            setView('live_race');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs transition shadow flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> 實況模擬
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Stable Activity Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">馬房本周公報 (Weekly Log)</h3>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
            {state.weeklyLogs.map((log, index) => (
              <div
                key={index}
                className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 text-xs leading-relaxed text-slate-300"
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* My Stable Horses Carousel/Grid */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">我的現役賽駒一覽 ({playerHorses.length})</h3>
          </div>
          <button
            onClick={() => setView('my_horses')}
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            管理馬房全部賽駒 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {playerHorses.map((horse) => (
            <div
              key={horse.id}
              onClick={() => setSelectedHorse(horse)}
              className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 cursor-pointer transition shadow-sm hover:shadow-md group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-amber-400">{horse.age}歲 {horse.gender === 'colt' ? '雄馬' : horse.gender === 'filly' ? '雌馬' : '閹馬'}</span>
                <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                  {horse.rating} 分
                </span>
              </div>
              <h4 className="text-base font-black text-white group-hover:text-amber-300 transition">
                {horse.nameZh}
              </h4>
              <p className="text-[11px] text-slate-400 font-serif italic mb-3">
                {horse.nameEn}
              </p>

              {/* Stats Bar */}
              <div className="space-y-1.5 text-[11px] pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span className="text-slate-400">途程範圍：</span>
                  <span className="text-slate-200 font-semibold">{horse.optimalDistance.min}-{horse.optimalDistance.max}米</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">狀態 / 疲勞：</span>
                  <span className="text-emerald-400 font-bold">{horse.fitness}% / {horse.fatigue}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">位置：</span>
                  <span className="text-slate-300">{horse.location === 'shatin' ? '沙田' : '從化基地'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Horse Modal */}
      {selectedHorse && (
        <HorseDetailModal
          horse={selectedHorse}
          onClose={() => setSelectedHorse(null)}
        />
      )}

      {/* Race Result Modal */}
      {selectedResultForModal && (
        <RaceResultModal
          result={selectedResultForModal}
          onClose={() => setSelectedResultForModal(null)}
        />
      )}

      {/* 馬圈突發事件抉擇彈窗 (Interactive HK Racing Dilemma Event Modal) */}
      {state.activeEvent && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                ⚡ 馬圈突發事件抉擇
              </span>
              <span className="text-xs text-slate-400">你的決定將影響馬房人脈、聲望與士氣</span>
            </div>

            <h3 className="text-xl font-black text-white">{state.activeEvent.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/70 border border-slate-800 rounded-xl p-4">
              {state.activeEvent.description}
            </p>

            <div className="space-y-2.5 pt-1">
              {state.activeEvent.choices.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => resolveEventChoice(ch.id)}
                  className="w-full text-left p-3.5 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 transition group"
                >
                  <div className="text-sm font-black text-white group-hover:text-amber-300 transition">
                    ▸ {ch.label}
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    效果預覽：{ch.hint}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 季末香港冠軍人馬獎頒獎禮彈窗 (Season Champion Awards Ceremony Modal) */}
      {state.seasonCeremony && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5">
            <div className="text-center space-y-1">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-black text-xs border border-amber-500/40">
                🏆 香港賽馬會年度盛事 • {state.seasonCeremony.seasonLabel}
              </div>
              <h3 className="text-2xl font-black text-white">香港冠軍人馬獎頒獎典禮</h3>
              <p className="text-xs text-slate-400">表揚全季表現最傑出之香港馬王、冠軍練馬師與冠軍騎師</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
                <div className="text-2xl mb-1">🐎</div>
                <div className="text-[11px] text-slate-400">年度香港馬王</div>
                <div className="text-base font-black text-amber-300 mt-0.5">{state.seasonCeremony.championHorseNameZh}</div>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
                <div className="text-2xl mb-1">🧙‍♂️</div>
                <div className="text-[11px] text-slate-400">冠軍練馬師</div>
                <div className="text-base font-black text-white mt-0.5">{state.seasonCeremony.championTrainerNameZh}</div>
              </div>
              <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-3.5">
                <div className="text-2xl mb-1">🏇</div>
                <div className="text-[11px] text-slate-400">冠軍騎師</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">{state.seasonCeremony.championJockeyNameZh}</div>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-300 flex items-center justify-between">
              <span>【{state.playerStableName}】本季累積戰績：</span>
              <span className="font-black text-amber-300">
                共奪 {state.seasonCeremony.playerWinsSeason} 場頭馬 • 總獎金 HK${state.seasonCeremony.playerPrizeSeasonHKD.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-black text-amber-300">🎙️ 請選擇上台致辭感言（獲得來季專屬加成）：</div>
              <button
                onClick={() => completeSeasonCeremony('humble')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs transition"
              >
                <b className="text-white">「榮耀屬於練馬師與馬房每一位幕後功臣！」</b>
                <span className="block text-emerald-400 mt-0.5">效果：全體香港練馬師信任度 +8</span>
              </button>
              <button
                onClick={() => completeSeasonCeremony('ambitious')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs transition"
              >
                <b className="text-white">「我哋嘅目標係橫掃香港打吡與國際一級賽！」</b>
                <span className="block text-amber-300 mt-0.5">效果：馬房業界聲望 +10</span>
              </button>
              <button
                onClick={() => completeSeasonCeremony('team')}
                className="w-full text-left p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-xs transition"
              >
                <b className="text-white">「多謝名下每一匹良駒同騎師全季拼搏！」</b>
                <span className="block text-sky-300 mt-0.5">效果：全體名下賽駒士氣 +10</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
