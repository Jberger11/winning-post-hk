import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Trophy, Medal, Crown, Star, Award } from 'lucide-react';
import { HorseDetailModal } from './HorseDetailModal';
import { Horse } from '../../types/horse';
import { CAREER_MILESTONES } from '../../engine/gameplayUpgradeEngine';

export const WorldRankingsScreen: React.FC = () => {
  const { state, triggerManualCeremony, setView } = useGame();
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);

  // 現役頂級馬王評分排行榜
  const rankedHorses = [...state.horses]
    .filter(h => !h.isRetired)
    .sort((a, b) => b.rating - a.rating);

  const unlockedCount = CAREER_MILESTONES.filter(m => m.isUnlocked(state)).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-xs text-yellow-300 font-bold uppercase">香港殿堂與浪琴世界馬匹排行榜</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            香港現役馬王榜與榮譽殿堂 (Hall of Fame)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            香港賽馬會評磅員權威評分排名，競逐年度「香港馬王」至尊頭銜與生涯里程碑
          </p>
        </div>

        <button
          onClick={() => {
            triggerManualCeremony();
            setView('dashboard');
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1.5 transition"
        >
          <Award className="w-4 h-4" />
          <span>舉行香港冠軍人馬獎頒獎禮</span>
        </button>
      </div>

      {/* Career Milestones Badges (生涯成就殿堂) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Medal className="w-5 h-5 text-amber-400" />
            <span>🏅 馬房生涯成就殿堂 ({unlockedCount} / {CAREER_MILESTONES.length})</span>
          </h3>
          <span className="text-xs text-slate-400">達成條件即可自動解鎖榮譽徽章</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {CAREER_MILESTONES.map((ms) => {
            const done = ms.isUnlocked(state);
            return (
              <div
                key={ms.id}
                className={`rounded-xl border p-3.5 text-center space-y-1.5 transition ${
                  done
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-md'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                }`}
              >
                <div className="text-2xl">{done ? ms.icon : '🔒'}</div>
                <div className="text-xs font-black text-white">{ms.nameZh}</div>
                <div className="text-[11px] text-slate-400 leading-snug">{ms.descZh}</div>
                <div className="text-[10px] font-mono font-bold text-amber-300 pt-1">
                  {ms.tier} • {ms.progressText(state)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hall of Fame Legendary Horses */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-base font-black text-white flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span>香港賽馬歷史名人堂 (Hall of Fame Legends)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {state.hallOfFame.map((legend, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-amber-500/30 rounded-xl p-4 flex items-start gap-4 shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-amber-500/20">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white">{legend.nameZh}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    {legend.yearInducted} 入選
                  </span>
                </div>
                <div className="text-xs font-bold text-amber-300/90 mt-0.5">{legend.title}</div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{legend.stats}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Season Horse Leaderboard */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <h3 className="text-base font-black text-white flex items-center justify-between">
          <span>現役賽駒國際評分總排行榜 (Ratings Leaderboard)</span>
          <span className="text-xs text-slate-400 font-normal">依官方評分排列</span>
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 text-center">排名</th>
                <th className="py-3 px-3">賽駒名稱</th>
                <th className="py-3 px-3 text-center">評分</th>
                <th className="py-3 px-3">年齡/性別</th>
                <th className="py-3 px-3">馬主</th>
                <th className="py-3 px-3">練馬師</th>
                <th className="py-3 px-3">生涯戰績</th>
                <th className="py-3 px-3 text-right">累積獎金</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {rankedHorses.map((h, index) => {
                const rank = index + 1;
                return (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedHorse(h)}
                    className={`cursor-pointer transition ${
                      h.isPlayerOwned ? 'bg-amber-500/10 hover:bg-amber-500/20 font-semibold' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block w-6 h-6 rounded-full text-xs font-black leading-6 ${
                        rank === 1 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' :
                        rank === 2 ? 'bg-slate-300 text-slate-950' :
                        rank === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {rank}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-extrabold text-white flex items-center gap-1.5">
                        <span>{h.nameZh}</span>
                        {h.isPlayerOwned && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                            我的馬
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-serif italic">{h.nameEn}</div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="text-sm font-black text-amber-300 font-mono">
                        {h.rating}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">
                      {h.age}歲 {h.gender === 'colt' ? '雄馬' : h.gender === 'filly' ? '雌馬' : '閹馬'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-300">{h.ownerName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{h.trainerName}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {h.careerStarts}戰 {h.wins}冠 {h.seconds}亞
                    </td>

                    <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">
                      HK${(h.totalPrizeMoney / 10000).toFixed(0)}萬
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedHorse && (
        <HorseDetailModal
          horse={selectedHorse}
          onClose={() => setSelectedHorse(null)}
        />
      )}
    </div>
  );
};
