import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Horse } from '../../types/horse';
import { evaluateBreeding } from '../../engine/geneticsEngine';
import { Dna, Sparkles, Heart, AlertTriangle, CheckCircle, Trophy, Baby } from 'lucide-react';

export const BreedingScreen: React.FC = () => {
  const { state, breedFoal, setView } = useGame();

  // 取得可用種馬 (Stallions)
  const stallions = state.horses.filter(h => h.gender === 'stallion' || (h.gender === 'colt' && h.rating >= 95));
  // 取得可用繁殖母馬 (Broodmares)
  const broodmares = state.horses.filter(h => h.gender === 'mare' || h.gender === 'filly');

  const [selectedStallionId, setSelectedStallionId] = useState<string>(stallions[0]?.id || '');
  const [selectedBroodmareId, setSelectedBroodmareId] = useState<string>(broodmares[0]?.id || '');

  const [foalNameZh, setFoalNameZh] = useState('');
  const [foalNameEn, setFoalNameEn] = useState('');
  const [successFoal, setSuccessFoal] = useState<Horse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedStallion = stallions.find(h => h.id === selectedStallionId) || stallions[0];
  const selectedBroodmare = broodmares.find(h => h.id === selectedBroodmareId) || broodmares[0];

  const candidate = (selectedStallion && selectedBroodmare)
    ? evaluateBreeding(selectedStallion, selectedBroodmare)
    : null;

  const handleBreed = () => {
    if (!selectedStallion || !selectedBroodmare) return;
    if (!foalNameZh.trim()) {
      setErrorMsg('請輸入初生幼駒之中文名（例如：神速金鎗、天賦勇士）');
      return;
    }

    const studFee = selectedStallion.studFee || 150000;
    if (state.playerFundsHKD < studFee) {
      setErrorMsg(`馬房儲備不足以支付配種費 HK$${studFee.toLocaleString()}`);
      return;
    }

    const res = breedFoal(
      selectedStallion.id,
      selectedBroodmare.id,
      foalNameZh.trim(),
      foalNameEn.trim() || 'New Champion'
    );

    if (res.success && res.foal) {
      setSuccessFoal(res.foal);
      setErrorMsg(null);
      setFoalNameZh('');
      setFoalNameEn('');
    } else {
      setErrorMsg(res.reason || '配種未能成功');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Dna className="w-5 h-5 text-pink-400" />
            <span className="text-xs text-pink-300 font-bold uppercase">Winning Post 10 2026 血統繁育系統</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            血統配合與名駒繁育中心 (Breeding Dynasty)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            融合始祖系統 (Founder Sire Line)、繁殖母馬活力度 (Vitality) 與名馬羈絆因子 (Drama Factors)，孕育跨世代草地霸主
          </p>
        </div>

        <div className="text-xs bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300">
          <span>繁育牧場等級：Lv 1 (從化/紐西蘭基地)</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successFoal && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 text-emerald-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              🍼
            </div>
            <div>
              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>恭賀新一代名駒【{successFoal.nameZh}】誕生！</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PPG 初出評分 52分
                </span>
              </div>
              <p className="text-slate-300 mt-0.5">
                父系【{selectedStallion?.nameZh}】× 母系【{selectedBroodmare?.nameZh}】，承繼【{successFoal.sireLine}】名門血脈！
              </p>
            </div>
          </div>

          <button
            onClick={() => { setSuccessFoal(null); setView('my_horses'); }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition"
          >
            前往我的賽駒檢視
          </button>
        </div>
      )}

      {/* Main Breeding Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stallion Picker */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-400"></span>
              1. 挑選頂級父系種馬 (Select Stallion)
            </h3>
            <span className="text-xs text-blue-400 font-bold">可選 {stallions.length} 匹</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {stallions.map((st) => {
              const isSelected = st.id === selectedStallion?.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStallionId(st.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-white text-sm">{st.nameZh}</span>
                    <span className="text-amber-300 font-bold">
                      配種費 HK${(st.studFee || 150000).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span>始祖系統：{st.sireLine}</span>
                    <span>•</span>
                    <span>速度 {st.attributes.speed}</span>
                    <span>•</span>
                    <span>耐力 {st.attributes.stamina}</span>
                    <span>•</span>
                    <span>鬥心 {st.attributes.guts}</span>
                  </div>
                  {st.pedigree.dramaTitle && (
                    <div className="text-[10px] text-amber-400/90 mt-1 font-semibold">
                      🏆 殿堂稱號：{st.pedigree.dramaTitle}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Broodmare Picker */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-400"></span>
              2. 挑選繁殖母馬 (Select Broodmare)
            </h3>
            <span className="text-xs text-pink-400 font-bold">可選 {broodmares.length} 匹</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {broodmares.map((bm) => {
              const isSelected = bm.id === selectedBroodmare?.id;
              return (
                <div
                  key={bm.id}
                  onClick={() => setSelectedBroodmareId(bm.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-pink-950/40 border-pink-500 text-pink-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-extrabold text-white text-sm">{bm.nameZh}</span>
                    <span className="text-pink-300 font-bold">
                      活力度 {bm.vitality}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span>父系血統：{bm.sireLine}</span>
                    <span>•</span>
                    <span>年齡 {bm.age}歲</span>
                    <span>•</span>
                    <span>評分 {bm.rating}分</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pedigree Compatibility Evaluation (Winning Post 10 2026 Core) */}
      {candidate && selectedStallion && selectedBroodmare && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                血統配合理論綜合評估 (Pedigree Compatibility Analysis)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                【{selectedStallion.nameZh}】× 【{selectedBroodmare.nameZh}】
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">配合度總評</span>
              <span className={`text-2xl font-black ${
                candidate.compatibilityScore >= 90 ? 'text-amber-300' :
                candidate.compatibilityScore >= 75 ? 'text-emerald-400' : 'text-slate-300'
              }`}>
                {candidate.compatibilityScore >= 90 ? 'S 級配合 (極上)' :
                 candidate.compatibilityScore >= 75 ? 'A 級配合 (優秀)' : 'B 級配合 (良好)'}
              </span>
            </div>
          </div>

          {/* 3 WP10 Factors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Factor 1: Inbreeding */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-bold">近親交配係數 (Inbreeding)</span>
                <span className={`font-mono font-bold ${
                  candidate.inbreedingPercent > 15 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {candidate.inbreedingPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {candidate.inbreedingPercent < 5
                  ? '✅ 異系配合 (Outcross)！體質強健無近親衰退隱患。'
                  : candidate.inbreedingPercent <= 12
                  ? '⚡ 理想 3×4 濃縮血統，速度爆發力強化！'
                  : '⚠️ 近親係數過高，幼駒體質與脾氣有衰退風險。'}
              </p>
            </div>

            {/* Factor 2: Broodmare Vitality */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-bold">母馬活力度 (Broodmare Vitality)</span>
                <span className="text-pink-400 font-mono font-bold">
                  +{candidate.vitalityBonus} 點加成
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                母馬體質充沛且充分休養，顯著提升子嗣天賦天花板。
              </p>
            </div>

            {/* Factor 3: Drama Factor */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-400 font-bold">名馬羈絆因子 (Drama Factor)</span>
                <span className="text-amber-400 font-mono font-bold">
                  {candidate.dramaIndex} / 100
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                父母兩系榮獲國際一級賽錦標之歷史光環，傳承冠軍鬥志。
              </p>
            </div>
          </div>

          {/* Foal Name Inputs & Confirm Action */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                新出生幼駒中文名 (例：金鎗神駒、遨遊星際)：
              </label>
              <input
                type="text"
                value={foalNameZh}
                onChange={(e) => setFoalNameZh(e.target.value)}
                placeholder="輸入中文馬名 (最多 4 字)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                幼駒英文名 (例：Golden Thunder)：
              </label>
              <input
                type="text"
                value={foalNameEn}
                onChange={(e) => setFoalNameEn(e.target.value)}
                placeholder="輸入英文馬名"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-serif"
              />
            </div>

            <button
              onClick={handleBreed}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-black text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <Baby className="w-4 h-4" />
              <span>確認配種並孕育幼駒 (支付 HK${(selectedStallion.studFee || 150000).toLocaleString()})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
