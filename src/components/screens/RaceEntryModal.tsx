import React, { useMemo, useState } from 'react';
import { RaceDefinition } from '../../types/race';
import { useGame } from '../../engine/gameStore';
import { isHorseEligibleForRace } from '../../engine/aiEngine';
import { forecastRace } from '../../engine/raceForecast';
import { Horse, RunningStyle } from '../../types/horse';
import { Shield, Users, CheckCircle, AlertCircle } from 'lucide-react';

interface RaceEntryModalProps {
  race: RaceDefinition;
  onClose: () => void;
  onSuccess: () => void;
}

export const RaceEntryModal: React.FC<RaceEntryModalProps> = ({ race, onClose, onSuccess }) => {
  const { state, enterRace, withdrawRaceEntry } = useGame();

  const eligContext = {
    activeRaceEntries: state.activeRaceEntries,
    completedRaceIdsForWeek: state.completedRaceIdsForWeek,
    weeklyResults: state.weeklyResults,
    currentWeek: state.currentCalendar.week,
    currentYear: state.currentCalendar.year,
    scheduledRaces: state.scheduledRaces,
  };

  const playerHorses = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);
  const eligibleHorses = playerHorses.filter(h => isHorseEligibleForRace(h, race, eligContext).eligible);
  const [selectedHorseId, setSelectedHorseId] = useState<string>(eligibleHorses[0]?.id || playerHorses[0]?.id || '');
  const [selectedJockeyId, setSelectedJockeyId] = useState<string>(state.jockeys[0]?.id || '');
  const [tactic, setTactic] = useState<RunningStyle>('stalker');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedHorse = playerHorses.find(h => h.id === selectedHorseId);
  const isEnteredInThisRace = selectedHorse ? (state.activeRaceEntries[race.id] || []).includes(selectedHorse.id) : false;
  const eligibility = selectedHorse
    ? isHorseEligibleForRace(selectedHorse, race, eligContext)
    : { eligible: false, reason: '請選擇賽駒' };

  const canForecast = !!selectedHorse && (eligibility.eligible || !!eligibility.alreadyEnteredRaceId || isEnteredInThisRace);
  const forecast = useMemo(
    () => (canForecast ? forecastRace(state, race, selectedHorseId, selectedJockeyId, tactic) : null),
    [canForecast, state, race, selectedHorseId, selectedJockeyId, tactic]
  );

  const handleConfirmEntry = () => {
    if (!selectedHorseId) {
      setErrorMessage('請先選擇代表出戰之賽駒');
      return;
    }
    if (isEnteredInThisRace) {
      withdrawRaceEntry(race.id, selectedHorseId);
      onSuccess();
      return;
    }
    if (!selectedJockeyId) {
      setErrorMessage('請選擇策騎大師傅');
      return;
    }
    if (!eligibility.eligible && !eligibility.alreadyEnteredRaceId) {
      setErrorMessage(`無法報名出賽：${eligibility.reason || '評分未符合此賽事條件'}`);
      return;
    }

    const res = enterRace(race.id, selectedHorseId, selectedJockeyId, tactic, eligibility.alreadyEnteredRaceId);
    if (res.success) {
      onSuccess();
    } else {
      setErrorMessage(res.reason || '報名失敗');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] text-amber-400 font-bold uppercase">{race.courseNameZh} • {race.distance}米</span>
            <h3 className="text-lg font-black text-white">{race.nameZh} 報名出賽</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {eligibleHorses.length === 0 && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              提示：馬房名下暫無符合此賽事評分條件之賽駒（要求：{race.conditions.minRating} - {race.conditions.maxRating} 分）。您仍可在馬房名單中檢視各駒狀態或前往拍賣會購入新駒。
            </span>
          </div>
        )}

        {/* 1. 選擇參賽賽駒 */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" /> 1. 選擇代表馬房出戰之賽駒：
          </label>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {playerHorses.map((h) => {
              const isEnteredHere = (state.activeRaceEntries[race.id] || []).includes(h.id);
              const elig = isHorseEligibleForRace(h, race, eligContext);
              const isSelected = h.id === selectedHorseId;

              return (
                <div
                  key={h.id}
                  onClick={() => { setSelectedHorseId(h.id); setErrorMessage(null); }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : isEnteredHere
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                      : elig.eligible || elig.alreadyEnteredRaceId
                      ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200'
                      : 'bg-slate-950/30 border-slate-900 text-slate-500 opacity-60'
                  }`}
                >
                  <div>
                    <div className="font-extrabold flex items-center gap-2">
                      <span>{h.nameZh}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({h.age}歲 / 評分 {h.rating}分)</span>
                      {isEnteredHere && (
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                          ✅ 已報名此場
                        </span>
                      )}
                      {!isEnteredHere && elig.alreadyEnteredRaceId && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">
                          ⚠️ 已報名其他場次 (可改投)
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      合適途程：{h.optimalDistance.min}-{h.optimalDistance.max}米 • 狀態 {h.fitness}% • 疲勞 {h.fatigue}%
                    </div>
                  </div>

                  {isEnteredHere ? (
                    <span className="text-[10px] text-emerald-400 font-bold">已排位</span>
                  ) : !elig.eligible && !elig.alreadyEnteredRaceId ? (
                    <span className="text-[10px] text-rose-400 font-bold max-w-[180px] text-right truncate" title={elig.reason}>
                      {elig.reason}
                    </span>
                  ) : isSelected ? (
                    <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. 選擇策騎大師傅 */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-sky-400" /> 2. 聘請策騎騎師：
          </label>
          <select
            value={selectedJockeyId}
            onChange={(e) => setSelectedJockeyId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {state.jockeys.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nameZh} ({j.nameEn}) - 評分 {j.rating}分 • 勝率 {(j.winRate * 100).toFixed(1)}% {j.weightClaim > 0 ? `(見習減${j.weightClaim}磅)` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 3. 制定跑法戰術 */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1.5">
            3. 制定出賽發揮戰術 (Running Style)：
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'front_runner', name: '領放 (Front)', desc: '出閘搶先領放' },
              { id: 'stalker', name: '前領 (Stalker)', desc: '守好位伺機而動' },
              { id: 'midfield', name: '居中 (Midfield)', desc: '留力保留最後衝刺' },
              { id: 'closer', name: '後勁 (Closer)', desc: '最後直路大外一氣' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTactic(t.id as RunningStyle)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  tactic === t.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-extrabold">{t.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. 賽前預測 */}
        {selectedHorse && canForecast && (
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-200">🔮 賽前預測（試跑 10 次）</span>
              <span className="text-slate-400">
                狀態 <span className={selectedHorse.fitness >= 80 ? 'text-emerald-300' : selectedHorse.fitness >= 65 ? 'text-amber-300' : 'text-rose-300'}>{Math.round(selectedHorse.fitness)}%</span>
                {' • '}疲勞 <span className={selectedHorse.fatigue < 40 ? 'text-emerald-300' : selectedHorse.fatigue < 70 ? 'text-amber-300' : 'text-rose-300'}>{Math.round(selectedHorse.fatigue)}%</span>
              </span>
            </div>
            {(selectedHorse.fatigue >= 70 || selectedHorse.fitness < 65) && (
              <div className="text-rose-300">
                ⚠️ {selectedHorse.fatigue >= 70 ? '疲勞偏高，' : ''}{selectedHorse.fitness < 65 ? '狀態未夠，' : ''}出賽表現會打折扣，可考慮休息或調教後再戰。
              </div>
            )}
            {forecast ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-400">預計名次</div>
                    <div className="font-black text-white">
                      約第 {forecast.avgPlacing.toFixed(1)} 名
                      <span className="text-[10px] text-slate-400 font-normal"> / {forecast.fieldSize}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">範圍 {forecast.bestPlacing}-{forecast.worstPlacing}</div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-400">勝出機會</div>
                    <div className="font-black text-amber-300">{forecast.winPct}%</div>
                  </div>
                  <div className="bg-slate-950/60 rounded-lg p-2">
                    <div className="text-slate-400">上名 (前三)</div>
                    <div className="font-black text-emerald-300">{forecast.top3Pct}%</div>
                  </div>
                </div>
                {forecast.rivals.length > 0 && (
                  <div>
                    <div className="text-slate-400 mb-1">主要對手</div>
                    <div className="flex flex-wrap gap-1.5">
                      {forecast.rivals.map((r) => (
                        <span key={r.horseId} className="px-2 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-200">
                          {r.nameZh} <span className="text-slate-500">評分 {r.rating} • 勝 {r.winPct}%</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-slate-500">實際出賽仍有隨機性，對手陣容以出賽當刻為準。</div>
              </>
            ) : (
              <div className="text-slate-500">未能預測此場。</div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            報名費：免收 (香港常規出賽)
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
            >
              取消
            </button>
            {isEnteredInThisRace ? (
              <button
                onClick={handleConfirmEntry}
                className="px-5 py-2 font-black text-xs rounded-xl transition bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 active:scale-95"
              >
                退出此場報名
              </button>
            ) : eligibility.alreadyEnteredRaceId ? (
              <button
                onClick={handleConfirmEntry}
                className="px-5 py-2 font-black text-xs rounded-xl transition bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95"
              >
                改投此場出賽 (退出原報名)
              </button>
            ) : (
              <button
                onClick={handleConfirmEntry}
                className={`px-5 py-2 font-black text-xs rounded-xl transition ${
                  eligibility.eligible
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 shadow-md shadow-amber-500/20 active:scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 active:scale-95'
                }`}
              >
                {eligibility.eligible ? '確認報名出賽' : '資格不合 (查看原因)'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
