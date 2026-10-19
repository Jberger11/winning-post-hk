import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Users, Award, Star, Shield, Trophy, CheckCircle } from 'lucide-react';

export const JockeysTrainersScreen: React.FC = () => {
  const { state, socializeWithPerson } = useGame();
  const [tab, setTab] = useState<'jockeys' | 'trainers'>('jockeys');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSocial = (type: 'jockey' | 'trainer', id: string, nameZh: string, cost: number, label: string) => {
    const res = socializeWithPerson(type, id, cost, label);
    if (res.success) {
      setNotice(`已邀請【${nameZh}】出席「${label}」，雙方關係與合作信任度大增！`);
    } else {
      setNotice(`操作失敗：${res.reason}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="text-xs text-blue-300 font-bold uppercase">香港賽馬會持牌人物與馬圈社交圈</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            騎師與練馬師人脈圈 (Jockeys, Trainers & Social Circle)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            透過沙田早茶、快活谷會員廂房與慈善晚宴經營馬圈人脈，提升騎師交情與練馬師信任度
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setTab('jockeys')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              tab === 'jockeys' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            香港持牌騎師 ({state.jockeys.length})
          </button>
          <button
            onClick={() => setTab('trainers')}
            className={`px-4 py-2 rounded-lg font-bold transition ${
              tab === 'trainers' ? 'bg-blue-500 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            香港持牌練馬師 ({state.trainers.length})
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {tab === 'jockeys' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {state.jockeys.map((jockey) => {
            const bond = jockey.bond ?? 35;
            const bondLabel = bond >= 75 ? '🔥 生死摯友' : bond >= 50 ? '🤝 合作無間' : bond >= 25 ? '👍 關係友好' : '➖ 點頭之交';
            return (
              <div
                key={jockey.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition shadow-lg space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow">
                        {jockey.avatar}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">{jockey.nameZh}</h3>
                        <span className="text-xs text-slate-400 font-serif">{jockey.nameEn}</span>
                      </div>
                    </div>
                    <span className="text-base font-black text-amber-300">{jockey.rating}分</span>
                  </div>

                  {jockey.specialtyZh && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-bold">
                      ★ {jockey.specialtyZh}
                    </div>
                  )}

                  {/* Bond Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">馬房交情：{bondLabel}</span>
                      <span className="font-mono font-bold text-emerald-400">{bond}/100</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(5, Math.min(100, bond))}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-400">走位 / 步速 / 衝刺：</span>
                      <span className="font-bold">{jockey.positioning} / {jockey.paceControl} / {jockey.finishing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">生涯勝率：</span>
                      <span className="font-bold text-emerald-400">{(jockey.winRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  {jockey.weightClaim > 0 && (
                    <div className="p-1.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold text-center">
                      見習生獲減 {jockey.weightClaim} 磅優惠
                    </div>
                  )}
                </div>

                {/* Social Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleSocial('jockey', jockey.id, jockey.nameZh, 10000, '沙田晨操後飲早茶')}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-800 text-[11px] font-bold transition"
                  >
                    🍵 飲早茶 ($1萬)
                  </button>
                  <button
                    onClick={() => handleSocial('jockey', jockey.id, jockey.nameZh, 30000, '快活谷夜賽廂房聚會')}
                    className="px-2 py-1.5 rounded-lg bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 text-[11px] font-bold transition"
                  >
                    🥂 廂房飯局 ($3萬)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {state.trainers.map((tr) => {
            const trust = tr.trust ?? 65;
            return (
              <div
                key={tr.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 transition shadow-lg space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shadow">
                        {tr.avatar}
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">{tr.nameZh}</h3>
                        <span className="text-xs text-slate-400 font-serif">{tr.nameEn}</span>
                      </div>
                    </div>
                    <span className="text-sm font-black text-amber-300">{tr.rating}分</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">調教專長與作風</span>
                    <span className="text-amber-300 font-extrabold block">{tr.specialtyZh}</span>
                    {tr.styleZh && <span className="text-[11px] text-slate-400 block">{tr.styleZh}</span>}
                  </div>

                  {/* Trust Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">合作信任度 (Trust)</span>
                      <span className="font-mono font-bold text-emerald-400">{trust}/100</span>
                    </div>
                    <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(5, Math.min(100, trust))}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">晨操成長加成：</span>
                      <span className="font-bold text-emerald-400">+{((tr.trainingBonus - 1) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">練馬師勝率：</span>
                      <span className="font-bold text-emerald-400">{(tr.winRate * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Social Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleSocial('trainer', tr.id, tr.nameZh, 25000, '馬主會所品茗交流')}
                    className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-slate-300 border border-slate-800 text-xs font-bold transition"
                  >
                    🍽️ 會所晚宴 ($2.5萬)
                  </button>
                  <button
                    onClick={() => handleSocial('trainer', tr.id, tr.nameZh, 50000, '粉嶺高爾夫球敘')}
                    className="px-2.5 py-2 rounded-lg bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
                  >
                    ⛳ 高球聚會 ($5萬)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

