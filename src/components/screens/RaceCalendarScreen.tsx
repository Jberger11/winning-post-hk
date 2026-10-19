import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { HK_RACES_CALENDAR, getMeetingInfo } from '../../data/hkRaces';
import { RaceDefinition, RaceSimulationResult } from '../../types/race';
import { RaceEntryModal } from './RaceEntryModal';
import { RaceResultModal } from './RaceResultModal';
import { Calendar, Trophy, Play, CheckCircle, Sparkles } from 'lucide-react';
import { isHorseEligibleForRace } from '../../engine/aiEngine';

export const RaceCalendarScreen: React.FC = () => {
  const { state, setView, runRaceSimulation, viewRaceReplay, withdrawRaceEntry } = useGame();
  const currentWeek = state.currentCalendar.week;
  const currentMeeting = getMeetingInfo(currentWeek);

  const eligContext = {
    activeRaceEntries: state.activeRaceEntries,
    completedRaceIdsForWeek: state.completedRaceIdsForWeek,
    weeklyResults: state.weeklyResults,
    currentWeek: state.currentCalendar.week,
    currentYear: state.currentCalendar.year,
    scheduledRaces: state.scheduledRaces,
  };

  const [filterType, setFilterType] = useState<
    'all' | 'current_week' | 'eligible' | 'group' | 'classic' | 'handicap' | 'overseas'
  >('current_week');
  const [selectedRaceForEntry, setSelectedRaceForEntry] = useState<RaceDefinition | null>(null);
  const [selectedResultForModal, setSelectedResultForModal] = useState<RaceSimulationResult | null>(null);

  const playerOwnedActive = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);
  const currentWeekRaces = HK_RACES_CALENDAR.filter(r => r.week === currentWeek);
  const eligibleThisWeekCount = currentWeekRaces.filter(r =>
    playerOwnedActive.some(h => isHorseEligibleForRace(h, r, eligContext).eligible)
  ).length;

  const filteredRaces = HK_RACES_CALENDAR.filter((r) => {
    if (filterType === 'current_week') return r.week === currentWeek;
    if (filterType === 'eligible') {
      return r.week === currentWeek && playerOwnedActive.some(h => isHorseEligibleForRace(h, r, eligContext).eligible);
    }
    if (filterType === 'group') return r.grade === 'G1' || r.grade === 'G2' || r.grade === 'G3';
    if (filterType === 'classic') return r.grade === 'CLASSIC_4YO';
    if (filterType === 'overseas') return r.course === 'overseas';
    if (filterType === 'handicap') return r.grade.startsWith('CLASS_');
    return true;
  }).sort((a, b) => (a.week - b.week) || ((a.raceNumber || 0) - (b.raceNumber || 0)));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-sky-400" />
            <span className="text-xs text-sky-300 font-bold uppercase">香港賽馬會官方賽事排位表</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            賽事日程與報名中心 (Fixtures & Entries)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            當前進行至 {state.currentCalendar.season} 第 <span className="text-amber-400 font-bold">{currentWeek}</span> 周
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          {[
            { id: 'current_week', label: `本周排位 (W${currentWeek})` },
            { id: 'eligible', label: `✨ 我可報名 (${eligibleThisWeekCount}場)` },
            { id: 'classic', label: '四歲經典打吡系列' },
            { id: 'group', label: '國際分級賽 (G1-G3)' },
            { id: 'handicap', label: '第一至五班讓賽' },
            { id: 'overseas', label: '海外遠征大賽' },
            { id: 'all', label: '全季賽事' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                filterType === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Meeting Banner */}
      {(filterType === 'current_week' || filterType === 'eligible') && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-700/80 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
              {currentMeeting.course === 'shatin' ? '🏟️' : '🌃'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-white text-lg sm:text-xl">
                  {currentMeeting.courseNameZh} • {currentMeeting.dayTextZh}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  全日共 {currentMeeting.raceCount} 場賽事 (第 1 場 - 第 {currentMeeting.raceCount} 場)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                包含第一至五班完整讓賽及重要盃賽錦標，所有評分賽駒均有常規賽事報名。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">馬房現役賽駒合資格：</span>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 text-xs">
              {eligibleThisWeekCount} 場賽事可報名
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredRaces.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <p className="text-base font-bold text-slate-300 mb-1">暫無符合條件的賽事</p>
          <p className="text-xs">請切換上方分類標籤檢視其他賽程。</p>
        </div>
      )}

      {/* Race Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRaces.map((race) => {
          const isThisWeek = race.week === currentWeek;
          const enteredHorses = state.activeRaceEntries[race.id] || [];
          const hasPlayerEntry = enteredHorses.length > 0;
          const isCompleted = state.completedRaceIdsForWeek?.includes(race.id);
          const result = state.weeklyResults?.[race.id];
          const playerPlacing = result?.placings.find(p => {
            const h = state.horses.find(horse => horse.id === p.horseId);
            return h?.isPlayerOwned;
          });

          const eligiblePlayerHorses = playerOwnedActive.filter(
            h => isHorseEligibleForRace(h, race, eligContext).eligible
          );
          const canPlayerEnter = eligiblePlayerHorses.length > 0;

          // Clean race name to avoid repeating "第X場:"
          const cleanedNameZh = race.nameZh.replace(/^第\d+場:\s*/, '');
          const cleanedNameEn = race.nameEn.replace(/^Race\s*\d+:\s*/i, '');

          return (
            <div
              key={race.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition shadow-md ${
                isCompleted
                  ? 'bg-slate-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : hasPlayerEntry
                  ? 'bg-slate-900/95 border-emerald-500/50 ring-2 ring-emerald-500/30'
                  : isThisWeek
                  ? 'bg-gradient-to-br from-slate-900 to-slate-900/90 border-amber-500/40 ring-1 ring-amber-500/20'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div>
                {/* Header row */}
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2.5 py-0.5 rounded font-black bg-amber-500 text-slate-950 shadow-sm">
                      第 {race.raceNumber || 1} 場
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                      W{race.week}
                    </span>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
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
                      {race.grade === 'CLASSIC_4YO' ? '四歲經典大賽' :
                       race.grade === 'CLASS_1' ? '第一班' :
                       race.grade === 'CLASS_2' ? '第二班' :
                       race.grade === 'CLASS_3' ? '第三班' :
                       race.grade === 'CLASS_4' ? '第四班' :
                       race.grade === 'CLASS_5' ? '第五班' : race.grade}
                    </span>

                    {canPlayerEnter && !hasPlayerEntry && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> 可報名
                      </span>
                    )}

                    {isCompleted ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> 已完賽
                      </span>
                    ) : isThisWeek ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                        本周開跑
                      </span>
                    ) : null}
                  </div>

                  {hasPlayerEntry && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {enteredHorses.map(hid => {
                        const h = state.horses.find(horse => horse.id === hid);
                        return (
                          <span
                            key={hid}
                            className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>已報名：【{h?.nameZh || '名下馬'}】</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                withdrawRaceEntry(race.id, hid);
                              }}
                              className="text-emerald-400 hover:text-rose-400 font-bold ml-1 text-xs"
                              title="退出此場報名"
                            >
                              ✕ 退出
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black text-white">{cleanedNameZh}</h3>
                <p className="text-xs text-slate-400 font-serif italic mb-3">{cleanedNameEn}</p>

                {race.description && (
                  <p className="text-xs text-amber-300/80 mb-3 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                    {race.description}
                  </p>
                )}

                {/* 完賽結果概要 (Winner & Player Placing) */}
                {isCompleted && result && (
                  <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 text-xs space-y-1 mb-3">
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

                {/* Details list */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px]">場地與途程</span>
                    <span className="font-bold text-white">{race.courseNameZh} • {race.distance} 米</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">路面類別</span>
                    <span className="font-bold text-emerald-400">{race.surface === 'turf' ? '草地' : '全天候泥地'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">賽事總獎金</span>
                    <span className="font-bold text-amber-300">HK$ {(race.purseHKD).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">參賽評分資格</span>
                    <span className="font-bold text-slate-200">
                      {race.conditions.minRating} - {race.conditions.maxRating} 分
                      {race.conditions.isFourYearOldOnly ? ' (限4歲)' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isCompleted && result ? (
                <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedResultForModal(result)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow"
                  >
                    <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                    <span>查看賽果報告</span>
                  </button>

                  <button
                    onClick={() => viewRaceReplay(result)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>重溫實況</span>
                  </button>
                </div>
              ) : (
                <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedRaceForEntry(race)}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                      hasPlayerEntry
                        ? 'bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300'
                        : canPlayerEnter
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 font-black'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
                    }`}
                  >
                    {hasPlayerEntry
                      ? '📋 管理報名 / 退出'
                      : canPlayerEnter
                      ? '✨ 報名出賽'
                      : '報名出賽'}
                  </button>

                  <button
                    onClick={() => {
                      runRaceSimulation(race.id);
                      setView('live_race');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs transition shadow flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>實況模擬</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Entry Modal */}
      {selectedRaceForEntry && (
        <RaceEntryModal
          race={selectedRaceForEntry}
          onClose={() => setSelectedRaceForEntry(null)}
          onSuccess={() => setSelectedRaceForEntry(null)}
        />
      )}

      {/* Race Result Modal */}
      {selectedResultForModal && (
        <RaceResultModal
          result={selectedResultForModal}
          onClose={() => setSelectedResultForModal(null)}
        />
      )}
    </div>
  );
};
