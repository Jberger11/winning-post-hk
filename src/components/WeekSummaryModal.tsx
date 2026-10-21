import React from 'react';
import { useGame } from '../engine/gameStore';

const money = (n: number) => `HK$${Math.round(n).toLocaleString()}`;

/** 推進下一周後嘅上周結算：賽果、收支、馬匹疲勞變化、下周可報名場數 */
export const WeekSummaryModal: React.FC = () => {
  const { state, dismissWeekSummary, setView } = useGame();
  const s = state.lastWeekSummary;
  if (!s) return null;

  const net = s.prizeIncomeHKD - s.expensesHKD;
  const close = (view?: Parameters<typeof setView>[0]) => {
    dismissWeekSummary();
    if (view) setView(view);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950/40 border-b border-slate-800 p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-emerald-300 font-bold mb-1">📒 每周結算</div>
            <h2 className="text-xl font-black text-white">第 {s.week} 周總結</h2>
          </div>
          <button
            onClick={() => close()}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-base font-bold transition"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 text-xs">
          <section>
            <h3 className="text-sm font-bold text-white mb-2">🏇 出賽成績</h3>
            {s.races.length === 0 ? (
              <div className="text-slate-500">上周冇馬出賽。</div>
            ) : (
              <div className="space-y-1">
                {s.races.map((r, i) => (
                  <div
                    key={`${r.raceId}-${i}`}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                      r.placing === 1 ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-slate-950/60'
                    }`}
                  >
                    <span className={`w-12 font-black ${r.placing <= 3 ? 'text-amber-300' : 'text-slate-300'}`}>
                      第 {r.placing}/{r.fieldSize}
                    </span>
                    <span className="flex-1 truncate text-slate-200">
                      【{r.horseNameZh}】{r.raceNameZh}
                    </span>
                    {r.autoRun && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                        自動出賽
                      </span>
                    )}
                    <span className="w-24 text-right font-mono text-emerald-300">
                      {r.prizeHKD > 0 ? `+${money(r.prizeHKD)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">💰 收支</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-950/60 rounded-lg p-2.5">
                <div className="text-slate-400">獎金收入</div>
                <div className="font-mono font-bold text-emerald-300">+{money(s.prizeIncomeHKD)}</div>
              </div>
              <div className="bg-slate-950/60 rounded-lg p-2.5">
                <div className="text-slate-400">營運開支</div>
                <div className="font-mono font-bold text-rose-300">-{money(s.expensesHKD)}</div>
              </div>
              <div className="bg-slate-950/60 rounded-lg p-2.5">
                <div className="text-slate-400">淨額</div>
                <div className={`font-mono font-bold ${net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {net >= 0 ? '+' : '-'}{money(Math.abs(net))}
                </div>
              </div>
            </div>
            <div className="text-slate-500 mt-1.5">現有資金 {money(s.fundsAfterHKD)}</div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-white mb-2">🐎 馬匹狀況</h3>
            <div className="space-y-1">
              {s.horses.map((h) => {
                const d = Math.round(h.fatigueAfter - h.fatigueBefore);
                return (
                  <div key={h.horseId} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950/60">
                    <span className="flex-1 truncate font-semibold text-slate-200">{h.nameZh}</span>
                    {h.isInjured && <span className="text-rose-400 font-bold">傷患中</span>}
                    <span className="w-28 text-slate-400">
                      疲勞 {Math.round(h.fatigueAfter)}%
                      <span className={d <= 0 ? 'text-emerald-400' : 'text-rose-400'}> ({d <= 0 ? d : `+${d}`})</span>
                    </span>
                    <span className="w-20 text-right text-slate-400">狀態 {Math.round(h.fitness)}%</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3 text-slate-200">
            📅 本周共 {s.nextWeekRaceCount} 場賽事，你嘅馬房有{' '}
            <span className="font-bold text-emerald-300">{s.nextWeekEnterableRaceCount}</span> 場合資格報名。
          </section>
        </div>

        <div className="bg-slate-950 border-t border-slate-800 p-4 flex justify-between items-center gap-2">
          <button
            onClick={() => close()}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition"
          >
            收埋
          </button>
          <button
            onClick={() => close('calendar')}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-lg transition shadow"
          >
            去報名本周賽事
          </button>
        </div>
      </div>
    </div>
  );
};
