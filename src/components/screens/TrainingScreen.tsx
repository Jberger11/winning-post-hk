import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { TrainingMenu } from '../../engine/trainingEngine';
import { TRACKWORK_CHALLENGES, TrackworkEvaluation } from '../../engine/gameplayUpgradeEngine';
import { Dumbbell, Shield, Sparkles, Activity, AlertCircle, CheckCircle, Waves, Coffee, Award } from 'lucide-react';

export const TrainingScreen: React.FC = () => {
  const { state, trainHorse, runTrackworkTrial } = useGame();
  const playerHorses = state.horses.filter(h => h.isPlayerOwned && !h.isRetired);

  const [selectedHorseId, setSelectedHorseId] = useState<string>(playerHorses[0]?.id || '');
  const [selectedJockeyId, setSelectedJockeyId] = useState<string>(state.jockeys[0]?.id || '');
  const [lastLog, setLastLog] = useState<string | null>(null);
  const [trialResult, setTrialResult] = useState<TrackworkEvaluation | null>(null);

  const selectedHorse = playerHorses.find(h => h.id === selectedHorseId) || playerHorses[0];
  const selectedJockey = state.jockeys.find(j => j.id === selectedJockeyId) || state.jockeys[0];
  const currentChallenge = TRACKWORK_CHALLENGES[(state.currentCalendar.week + (selectedHorse?.age || 3)) % TRACKWORK_CHALLENGES.length];
  const affKey = `${selectedHorse?.id}_${selectedJockey?.id}`;
  const currentAffinity = state.horseJockeyAffinity?.[affKey] ?? 65;
  const trialDoneThisWeek = selectedHorse ? state.trackworkTrialDoneWeek?.[selectedHorse.id] === state.currentCalendar.week : false;

  const trainingOptions: {
    id: TrainingMenu;
    nameZh: string;
    targetZh: string;
    fatigueDesc: string;
    description: string;
    icon: string;
  }[] = [
    {
      id: 'fast_gallop',
      nameZh: '沙田草地晨操快跳 (Fast Gallop)',
      targetZh: '速度 (Speed) + 爆發力 (Acceleration)',
      fatigueDesc: '疲勞 +16 • 狀態 +6',
      description: '沙田草地最後試準晨操快跳，步頭開揚，著力激發競賽極限速度與最後爆發。',
      icon: '⚡',
    },
    {
      id: 'trotting',
      nameZh: '內圈踱步慢跳 (Trotting & Canter)',
      targetZh: '靈性 (Intelligence) + 穩定 (Consistency) + 脾氣',
      fatigueDesc: '疲勞 +7 • 狀態 +3',
      description: '於沙田內圈踱步兩圈，神態自若，調教馬匹聽從騎師留放與情緒沉著。',
      icon: '🧘',
    },
    {
      id: 'barrier_trial',
      nameZh: '1200米大閘實戰試閘 (Barrier Trial)',
      targetZh: '鬥心 (Guts) + 爆發力 + 出閘反應',
      fatigueDesc: '疲勞 +22 • 狀態 +9',
      description: '全套佩戴彩衣參加全天候大閘試閘，模擬實戰出閘搶位，大幅磨練終點死拼鬥志！',
      icon: '🏁',
    },
    {
      id: 'swimming',
      nameZh: '從化馬匹專用泳池游水 (Equine Swimming)',
      targetZh: '耐力 (Stamina) + 力量 (Power) + 心肺',
      fatigueDesc: '疲勞 +9 • 狀態 +5',
      description: '前往從化基地恆溫馬匹專用泳池，零關節負重增強心肺長力，調教筋腱彈性。',
      icon: '🏊',
    },
    {
      id: 'conghua_rest',
      nameZh: '從化溫泉水療及高壓氧放草 (Conghua Spa & Paddock)',
      targetZh: '消除疲勞 -35 + 恢復健康 (Health)',
      fatigueDesc: '疲勞 -35 • 治癒暗傷',
      description: '送往從化溫泉水療及高壓氧艙享受深層放鬆，草場放草悠閒散步，疲勞徹底一掃而空。',
      icon: '♨️',
    },
  ];

  const handleTrain = (menu: TrainingMenu) => {
    if (!selectedHorse) return;
    trainHorse(selectedHorse.id, menu);
    setLastLog(`已完成【${selectedHorse.nameZh}】調教訓練！`);
  };

  const handleTrialChoice = (choiceId: string) => {
    if (!selectedHorse) return;
    const res = runTrackworkTrial(selectedHorse.id, currentChallenge.id, choiceId, selectedJockey?.id);
    if (res) {
      setTrialResult(res);
      setLastLog(res.summaryZh);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-5 h-5 text-violet-400" />
            <span className="text-xs text-violet-300 font-bold uppercase">沙田馬房與從化訓練基地</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            晨操調教與今日試蹄考驗 (Trackwork & Sectional Trial)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            執行練馬師晨操分段時間考驗，培養騎師與賽駒之「人馬合拍度」，突破天賦潛力上限
          </p>
        </div>

        {/* Selected Horse & Jockey Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">調教賽駒：</span>
            <select
              value={selectedHorse?.id || ''}
              onChange={(e) => { setSelectedHorseId(e.target.value); setLastLog(null); setTrialResult(null); }}
              className="bg-transparent text-white font-extrabold text-xs focus:outline-none cursor-pointer"
            >
              {playerHorses.map(h => (
                <option key={h.id} value={h.id} className="bg-slate-900">
                  {h.nameZh} ({h.age}歲 / {h.rating}分)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">主操騎師：</span>
            <select
              value={selectedJockey?.id || ''}
              onChange={(e) => setSelectedJockeyId(e.target.value)}
              className="bg-transparent text-amber-300 font-extrabold text-xs focus:outline-none cursor-pointer"
            >
              {state.jockeys.slice(0, 8).map(j => (
                <option key={j.id} value={j.id} className="bg-slate-900">
                  {j.nameZh} (評分 {j.rating})
                </option>
              ))}
            </select>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
              合拍度 {currentAffinity}%
            </span>
          </div>
        </div>
      </div>

      {/* 今日晨操試蹄考驗 (Interactive Morning Trackwork Sectional Challenge) */}
      {selectedHorse && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs">
                🏇 今日晨操試蹄考驗
              </span>
              <span className="text-sm font-black text-white">
                主理練馬師【{selectedHorse.trainerName}】晨操分段指令
              </span>
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold">
              {currentChallenge.targetSectionalZh}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 italic">
            {currentChallenge.trainerInstructionZh}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {currentChallenge.options.map((opt) => (
              <button
                key={opt.id}
                disabled={trialDoneThisWeek}
                onClick={() => handleTrialChoice(opt.id)}
                className={`text-left p-3.5 rounded-xl border transition ${
                  trialDoneThisWeek
                    ? 'bg-slate-950/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-slate-950 hover:bg-amber-950/30 border-slate-800 hover:border-amber-500/50 group'
                }`}
              >
                <div className="text-xs font-black text-white group-hover:text-amber-300 mb-1">
                  ▸ {opt.labelZh}
                </div>
                <div className="text-[11px] text-slate-400 leading-snug">{opt.descZh}</div>
              </button>
            ))}
          </div>

          {trialResult && (
            <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-black text-emerald-300 text-sm">{trialResult.summaryZh}</div>
                <div className="text-slate-300 flex flex-wrap gap-3 font-mono">
                  <span>指示執行：<b>{trialResult.executionScore}分</b></span>
                  <span>步速掌握：<b>{trialResult.paceScore}分</b></span>
                  <span>馬匹放鬆：<b>{trialResult.relaxScore}分</b></span>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black shrink-0">
                評級 {trialResult.grade} • 人馬合拍度 +{trialResult.compatibilityBonus}%
              </div>
            </div>
          )}
        </div>
      )}

      {lastLog && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{lastLog} 最新狀態已即時更新至檔案！</span>
        </div>
      )}

      {selectedHorse && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Horse Status Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-xl font-black text-white">{selectedHorse.nameZh}</h3>
                <span className="text-xs text-slate-400 font-serif italic">{selectedHorse.nameEn}</span>
              </div>
              <span className="text-sm font-black px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {selectedHorse.rating} 分
              </span>
            </div>

            {/* Condition & Fatigue */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">當前競賽狀態 (Fitness)</span>
                  <span className="font-extrabold text-emerald-400">{selectedHorse.fitness}%</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${selectedHorse.fitness}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">當前疲勞累積 (Fatigue)</span>
                  <span className={`font-extrabold ${selectedHorse.fatigue > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {selectedHorse.fatigue}%
                  </span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      selectedHorse.fatigue > 60 ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${selectedHorse.fatigue}%` }}
                  />
                </div>
                {selectedHorse.fatigue > 75 && (
                  <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> 疲勞過高！強行快跳可能引發拉傷，建議從化放草。
                  </p>
                )}
              </div>
            </div>

            {/* Attributes Mini-View */}
            <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-2">關鍵能力現值</span>
              <div className="flex justify-between text-slate-300">
                <span>速度 (Speed)：</span>
                <span className="font-bold text-white">{selectedHorse.attributes.speed} <span className="text-slate-400 text-[10px]">/ {selectedHorse.geneticCeiling.speed}</span></span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>爆發 (Acceleration)：</span>
                <span className="font-bold text-white">{selectedHorse.attributes.acceleration} <span className="text-slate-400 text-[10px]">/ {selectedHorse.geneticCeiling.acceleration}</span></span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>耐力 (Stamina)：</span>
                <span className="font-bold text-white">{selectedHorse.attributes.stamina} <span className="text-slate-400 text-[10px]">/ {selectedHorse.geneticCeiling.stamina}</span></span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>鬥心 (Guts)：</span>
                <span className="font-bold text-white">{selectedHorse.attributes.guts} <span className="text-slate-400 text-[10px]">/ {selectedHorse.geneticCeiling.guts}</span></span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>體質 (Health)：</span>
                <span className="font-bold text-white">{selectedHorse.attributes.health} <span className="text-slate-400 text-[10px]">/ {selectedHorse.geneticCeiling.health}</span></span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              主理練馬師：<span className="text-slate-200 font-bold">{selectedHorse.trainerName}</span>
            </div>
          </div>

          {/* Right: Training Menus */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>選擇本周調教訓練項目</span>
            </h3>

            {trainingOptions.map((opt) => (
              <div
                key={opt.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-violet-500/50 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition shadow-md group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition">
                    {opt.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition">
                      {opt.nameZh}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">{opt.description}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                      <span className="text-violet-300 font-semibold">{opt.targetZh}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-amber-400/90 font-mono">{opt.fatigueDesc}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleTrain(opt.id)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-md transition active:scale-95 shrink-0"
                >
                  開始調教
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
