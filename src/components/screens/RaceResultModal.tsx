import React, { useEffect } from 'react';
import { RaceSimulationResult } from '../../types/race';
import { useGame } from '../../engine/gameStore';
import confetti from 'canvas-confetti';
import { Trophy, Award, Coins, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';

interface RaceResultModalProps {
  result: RaceSimulationResult;
  onClose: () => void;
}

export const RaceResultModal: React.FC<RaceResultModalProps> = ({ result, onClose }) => {
  const { state, setView } = useGame();

  // 檢查玩家賽駒名次
  const playerHorsesIds = new Set(state.horses.filter(h => h.isPlayerOwned).map(h => h.id));
  const playerPlacing = result.placings.find(p => playerHorsesIds.has(p.horseId));

  const isPlayerWinner = playerPlacing && playerPlacing.placing === 1;

  useEffect(() => {
    if (isPlayerWinner) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {
        // ignore
      }
    }
  }, [isPlayerWinner]);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border-b border-slate-800 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/30">
                香港賽馬會正式公佈賽果
              </span>
              <span className="text-xs text-slate-400">
                {result.courseNameZh} • {result.distance}米 • 頭馬時間 {result.winningTime}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {result.raceNameZh}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-base font-bold transition"
          >
            ✕
          </button>
        </div>

        {/* Player Celebration Banner (if placed) */}
        {playerPlacing && (
          <div className={`px-6 py-3 border-b flex items-center justify-between text-xs sm:text-sm font-bold ${
            playerPlacing.placing === 1
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
              : playerPlacing.placing <= 3
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-800/60 border-slate-700 text-slate-300'
          }`}>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                【{playerPlacing.horseNameZh}】勇奪第 {playerPlacing.placing} 名！
                獲得獎金分賬 HK$ {Math.round(playerPlacing.prizeMoneyHKD * 0.7).toLocaleString()}
                （評分 {playerPlacing.ratingChange >= 0 ? `+${playerPlacing.ratingChange}` : playerPlacing.ratingChange} 分）
              </span>
            </div>
          </div>
        )}

        {/* Official Results & Post-Race Tactical Review */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* 賽後詳細戰術檢討與練馬師評語 (Jockey Life Style Tactical Review) */}
          {(() => {
            const rev = result.tacticalReview;
            const focusPlacing = playerPlacing || result.placings[0];
            if (!rev && !focusPlacing) return null;

            const expectedPos = rev ? rev.expectedPlacing : Math.max(1, Math.min(12, Math.round((focusPlacing.odds || 5) / 2.2)));
            const actualPos = rev ? rev.actualPlacing : focusPlacing.placing;
            const verdict = rev
              ? rev.verdict
              : actualPos === 1 && expectedPos >= 4
              ? '🔥 超水準神級發揮（爆冷奪冠）'
              : actualPos <= expectedPos
              ? '✨ 跑出好過預期'
              : '👍 大致跑出應有水準';

            const factors = rev
              ? rev.factors
              : [
                  { label: '彎位走位', text: '守二疊有遮擋好位（平均 1.4 疊），轉彎順暢慳位', impact: 1 },
                  { label: '步速與臨場指令', text: `鞍上人【${focusPlacing.jockeyNameZh}】留放得宜，尺寸拿捏準繩`, impact: 2 },
                  { label: '直路際遇', text: '入直路順利移出望空，末段衝刺強橫', impact: 2 },
                  { label: '末段體力分配', text: '400米處餘力充沛，末段締速凌厲', impact: 1 },
                ];

            const trainerQuote = rev
              ? rev.trainerQuote
              : `「${focusPlacing.trainerNameZh}：『${focusPlacing.horseNameZh}』今日狀態對辦，${focusPlacing.jockeyNameZh}走位發揮恰到好處！」`;

            const stewardsReport = rev
              ? rev.stewardsReport
              : `競賽小組報告：【${focusPlacing.horseNameZh}】直路望空後交出凌厲後勁，賽後依例抽取樣本檢驗。`;

            return (
              <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                      賽後詳細戰術檢討
                    </span>
                    <span className="text-sm font-black text-white">
                      【{rev ? rev.horseNameZh : focusPlacing.horseNameZh}】（騎師：{rev ? rev.jockeyNameZh : focusPlacing.jockeyNameZh}）
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300">
                      賽前預期：<b className="text-amber-300">第 {expectedPos} 名</b> → 實際：<b className="text-emerald-400">第 {actualPos} 名</b>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black">
                      {verdict}
                    </span>
                  </div>
                </div>

                {/* Factor Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {factors.map((f, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <span className="text-[11px] font-black text-amber-400 block mb-0.5">
                          ◆ {f.label}
                        </span>
                        <span className="text-slate-300 leading-relaxed">{f.text}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-mono font-black text-[11px] shrink-0 ${
                          f.impact > 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {f.impact > 0 ? `+${f.impact}` : f.impact}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Trainer Quote & Stewards Report */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-amber-300">🎙️ 練馬師賽後評語</span>
                      {rev && (
                        <span className="text-[11px] text-emerald-400 font-bold">
                          人馬合拍度 +{rev.compatibilityDelta} • 練馬師信任 {rev.trustDelta >= 0 ? `+${rev.trustDelta}` : rev.trustDelta}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 italic leading-relaxed">{trainerQuote}</p>
                  </div>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 text-xs">
                    <span className="font-black text-sky-300 block mb-1">⚖️ 香港賽馬會競賽小組報告 (Stewards' Report)</span>
                    <p className="text-slate-300 leading-relaxed">{stewardsReport}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="border border-slate-800 rounded-xl overflow-hidden shadow">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3 text-center">名次</th>
                  <th className="py-3 px-3">馬名 (賽駒)</th>
                  <th className="py-3 px-3">檔位</th>
                  <th className="py-3 px-3">騎師</th>
                  <th className="py-3 px-3">練馬師</th>
                  <th className="py-3 px-3">負磅</th>
                  <th className="py-3 px-3">勝負距離</th>
                  <th className="py-3 px-3">完成時間</th>
                  <th className="py-3 px-3 text-right">獎金 (HKD)</th>
                  <th className="py-3 px-3 text-center">評分調整</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {result.placings.map((p) => {
                  const isPlayerHorse = playerHorsesIds.has(p.horseId);

                  return (
                    <tr
                      key={p.horseId}
                      className={`transition ${
                        isPlayerHorse ? 'bg-amber-500/10 hover:bg-amber-500/15 font-semibold' : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-6 h-6 rounded-full text-xs font-black leading-6 ${
                          p.placing === 1 ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' :
                          p.placing === 2 ? 'bg-slate-300 text-slate-950' :
                          p.placing === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.placing}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-extrabold text-white flex items-center gap-1.5">
                        <span>{p.horseNameZh}</span>
                        {isPlayerHorse && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                            我的馬
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400">{p.gate} 檔</td>
                      <td className="py-2.5 px-3 text-slate-200">{p.jockeyNameZh}</td>
                      <td className="py-2.5 px-3 text-slate-400">{p.trainerNameZh}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">{p.weight} 磅</td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{p.marginText}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-200">{p.finishTimeFormatted}</td>

                      <td className="py-2.5 px-3 text-right font-mono text-amber-300 font-bold">
                        {p.prizeMoneyHKD > 0 ? `HK$${p.prizeMoneyHKD.toLocaleString()}` : '-'}
                      </td>

                      <td className="py-2.5 px-3 text-center font-bold">
                        {p.ratingChange > 0 ? (
                          <span className="text-emerald-400">+{p.ratingChange}</span>
                        ) : p.ratingChange < 0 ? (
                          <span className="text-rose-400">{p.ratingChange}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex justify-between items-center">
          <button
            onClick={() => { onClose(); setView('dashboard'); }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
          >
            返回大本營
          </button>

          <button
            onClick={() => { onClose(); setView('calendar'); }}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-lg transition shadow flex items-center gap-1.5"
          >
            <span>繼續觀看其他賽程</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
