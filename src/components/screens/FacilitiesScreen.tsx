import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { FacilityType } from '../../types/facility';
import { Building2, ArrowUpCircle, CheckCircle, AlertCircle, Coins, Sparkles } from 'lucide-react';

export const FacilitiesScreen: React.FC = () => {
  const { state, upgradeFacility } = useGame();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpgrade = (id: FacilityType) => {
    const res = upgradeFacility(id);
    if (res.success) {
      setSuccessMsg('設施成功升級！相關屬性成長與維護加成已即時生效。');
      setErrorMsg(null);
    } else {
      setErrorMsg(res.reason || '升級未能成功');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-teal-400" />
            <span className="text-xs text-teal-300 font-bold uppercase">從化訓練基地與沙田核心設施</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            馬房設施升級與營建中心 (Facilities Upgrade)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            擴充馬房容量，興建從化登山跑道、馬匹游泳池、天然溫泉水療與高壓氧艙，強化賽駒體格
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <Coins className="w-4 h-4 text-amber-400" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">可用儲備</span>
            <span className="text-sm font-black text-amber-300">
              HK$ {state.playerFundsHKD.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.facilities.map((fac) => {
          const isMax = fac.level >= fac.maxLevel;
          const canAfford = state.playerFundsHKD >= fac.costHKD;

          return (
            <div
              key={fac.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition shadow-lg"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-black text-white">{fac.nameZh}</h3>
                    <span className="text-xs text-slate-400 font-serif italic">{fac.nameEn}</span>
                  </div>

                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    Lv {fac.level} / {fac.maxLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mb-3">{fac.descriptionZh}</p>

                {/* Effect Banner */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1 mb-3">
                  <span className="text-teal-400 font-bold block">✨ 數值加成效果：</span>
                  <p className="text-slate-300">{fac.effectDescriptionZh}</p>
                </div>

                {/* Maintenance Fee */}
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>每周營運維護費：</span>
                  <span className="font-mono text-amber-400">
                    HK${(fac.maintenanceWeeklyHKD * fac.level).toLocaleString()} / 周
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-3 mt-4">
                <div>
                  <span className="text-[10px] text-slate-400 block">升級費用</span>
                  <span className="text-base font-black text-amber-300">
                    {isMax ? '已達頂峰' : `HK$${(fac.costHKD / 10000).toFixed(0)}萬`}
                  </span>
                </div>

                <button
                  onClick={() => handleUpgrade(fac.id)}
                  disabled={isMax}
                  className={`px-5 py-2.5 rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-md ${
                    isMax
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : canAfford
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 active:scale-95'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 active:scale-95'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>{isMax ? '已升至最高級' : canAfford ? '興建並升級' : '資金不足 (查看)'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
