import React, { useState } from 'react';
import { Horse, HorseAttributes } from '../../types/horse';
import { useGame } from '../../engine/gameStore';
import { Trophy, Award, Heart, Activity, Shield, Dna, History, ArrowRight } from 'lucide-react';

interface HorseDetailModalProps {
  horse: Horse;
  onClose: () => void;
}

export const HorseDetailModal: React.FC<HorseDetailModalProps> = ({ horse, onClose }) => {
  const { setView } = useGame();
  const [activeTab, setActiveTab] = useState<'attributes' | 'pedigree' | 'history'>('attributes');

  const attrLabels: Record<keyof HorseAttributes, { name: string; desc: string }> = {
    speed: { name: '速度 (Speed)', desc: '頂峰競賽極限極速' },
    stamina: { name: '耐力 (Stamina)', desc: '途程後勁支撐能力' },
    acceleration: { name: '爆發 (Acceleration)', desc: '直路瞬間提速威力' },
    power: { name: '力量 (Power)', desc: '負重及泥地抗逆能力' },
    guts: { name: '鬥心 (Guts)', desc: '終點前短兵相接死拼' },
    intelligence: { name: '靈性 (Intelligence)', desc: '聽從騎師走位戰術' },
    temperament: { name: '脾氣 (Temperament)', desc: '閘廂及步速沉著冷靜' },
    health: { name: '體質 (Health)', desc: '傷患抗性與恢復力' },
    flexibility: { name: '距離適應 (Flexibility)', desc: '適應不同途程之廣度' },
    consistency: { name: '穩定性 (Consistency)', desc: '各場賽事表現連貫度' },
  };

  const getRatingClass = (rating: number) => {
    if (rating >= 100) return { text: '分級賽/精英班', color: 'bg-purple-950/80 text-purple-300 border-purple-500/40' };
    if (rating >= 80) return { text: '第二班 (Class 2)', color: 'bg-blue-950/80 text-blue-300 border-blue-500/40' };
    if (rating >= 60) return { text: '第三班 (Class 3)', color: 'bg-teal-950/80 text-teal-300 border-teal-500/40' };
    if (rating >= 40) return { text: '第四班 (Class 4)', color: 'bg-amber-950/80 text-amber-300 border-amber-500/40' };
    return { text: '第五班 (Class 5)', color: 'bg-rose-950/80 text-rose-300 border-rose-500/40' };
  };

  const ratingInfo = getRatingClass(horse.rating);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950/40 border-b border-slate-800 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20">
              🐴
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {horse.nameZh}
                </h2>
                <span className="text-xs sm:text-sm font-serif text-slate-300 italic">
                  {horse.nameEn}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${ratingInfo.color}`}>
                  {ratingInfo.text}
                </span>
                {horse.isRetired && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    已退役
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span>{horse.age}歲 {horse.gender === 'colt' ? '雄馬' : horse.gender === 'filly' ? '雌馬' : horse.gender === 'stallion' ? '種馬' : horse.gender === 'mare' ? '母馬' : '閹馬'}</span>
                <span>•</span>
                <span>毛色：{horse.color}</span>
                <span>•</span>
                <span>出生地：{horse.country}</span>
                <span>•</span>
                <span>馬主：{horse.ownerName}</span>
                <span>•</span>
                <span>練馬師：{horse.trainerName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-[11px] text-amber-400 font-bold uppercase">香港賽馬會評分</div>
              <div className="text-2xl sm:text-3xl font-black text-amber-300">{horse.rating} 分</div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-base font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-6 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">生涯戰績</span>
            <span className="font-bold text-slate-200">
              {horse.careerStarts} 戰 {horse.wins} 冠 {horse.seconds} 亞 {horse.thirds} 季
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">累積獎金</span>
            <span className="font-bold text-amber-300">
              HK$ {horse.totalPrizeMoney.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">合適途程 / 場地</span>
            <span className="font-bold text-slate-200">
              {horse.optimalDistance.min}-{horse.optimalDistance.max}米 • {horse.preferredSurface === 'turf' ? '草地' : '泥地'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">狀態 / 疲勞</span>
            <span className="font-bold text-emerald-400">
              狀態 {horse.fitness}% • 疲勞 {horse.fatigue}%
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-6 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('attributes')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'attributes'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" /> 能力值與天賦上限 (WP10 2026)
          </button>
          <button
            onClick={() => setActiveTab('pedigree')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'pedigree'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dna className="w-4 h-4" /> 四代血統樹與始祖系統
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" /> 出賽往績與獎盃 ({horse.raceHistory.length})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'attributes' && (
            <div className="space-y-6">
              {/* 10 Attributes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(Object.keys(attrLabels) as (keyof HorseAttributes)[]).map((key) => {
                  const val = horse.attributes[key];
                  const ceiling = horse.geneticCeiling[key];
                  const info = attrLabels[key];
                  const pct = Math.min(100, val);
                  const ceilingPct = Math.min(100, ceiling);

                  return (
                    <div key={key} className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="font-bold text-slate-200">{info.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-extrabold text-sm">{val}</span>
                          <span className="text-slate-400 text-[10px]">/ 上限 {ceiling}</span>
                        </div>
                      </div>

                      {/* Bar with Ceiling Mark */}
                      <div className="relative h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        {/* Ceiling Tick */}
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-rose-400 shadow-sm"
                          style={{ left: `${ceilingPct}%` }}
                          title={`天賦潛力上限: ${ceiling}`}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{info.desc}</p>
                    </div>
                  );
                })}
              </div>

              {/* Running Style & Surface */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block mb-1">跑法戰術偏好</span>
                  <div className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>
                      {horse.runningStyle === 'front_runner' ? '領放 (Front-Runner)' :
                       horse.runningStyle === 'stalker' ? '前領 (Stalker)' :
                       horse.runningStyle === 'midfield' ? '居中 (Midfield)' : '後勁/後上 (Closer)'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">根據步速與出閘檔位策騎</p>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block mb-1">草地 / 泥地適性</span>
                  <div className="text-xs font-bold text-slate-200 space-y-1">
                    <div className="flex justify-between">
                      <span>草地 (Turf)：</span>
                      <span className="text-emerald-400">{horse.surfaceAffinity.turf}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>泥地 (Dirt)：</span>
                      <span className="text-amber-400">{horse.surfaceAffinity.dirt}%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
                  <span className="text-[11px] text-slate-400 block mb-1">成熟型態 (Maturity)</span>
                  <div className="text-base font-extrabold text-amber-300">
                    {horse.maturityType === 'early' ? '早熟型 (2-4歲極速)' :
                     horse.maturityType === 'normal' ? '普通型 (3-6歲黃金)' :
                     horse.maturityType === 'late' ? '晚熟型 (5-7歲大器晚成)' : '持效長青型 (巔峰綿延)'}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">影響各年齡段能力成長乘數</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pedigree' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                <div>
                  <span className="font-bold">始祖血系統：</span> {horse.sireLine}
                </div>
                <div>
                  <span className="font-bold">名馬羈絆因子 (Drama Factor)：</span> {horse.dramaFactor} / 100
                </div>
              </div>

              {/* Pedigree Tree Visualizer */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                {/* Gen 1: Horse */}
                <div className="bg-slate-950 border-2 border-amber-500/50 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[10px] text-amber-400 font-bold uppercase">本駒 (Subject)</span>
                  <div className="text-base font-extrabold text-white mt-1">{horse.nameZh}</div>
                  <div className="text-xs text-slate-400 font-serif">{horse.nameEn}</div>
                </div>

                {/* Gen 2: Sire & Dam */}
                <div className="space-y-3">
                  <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-3">
                    <span className="text-[10px] text-blue-400 font-bold uppercase">父系 (Sire)</span>
                    <div className="font-bold text-white mt-0.5">{horse.pedigree.sire?.nameZh || '名門種馬'}</div>
                    <div className="text-[11px] text-slate-400 font-serif">{horse.pedigree.sire?.nameEn || 'Stallion'}</div>
                    <div className="text-[10px] text-amber-400 mt-1">{horse.pedigree.sire?.dramaTitle || horse.sireLine}</div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-700 rounded-xl p-3">
                    <span className="text-[10px] text-pink-400 font-bold uppercase">母系 (Dam)</span>
                    <div className="font-bold text-white mt-0.5">{horse.pedigree.dam?.nameZh || '優質母馬'}</div>
                    <div className="text-[11px] text-slate-400 font-serif">{horse.pedigree.dam?.nameEn || 'Broodmare'}</div>
                  </div>
                </div>

                {/* Gen 3: Grandparents */}
                <div className="space-y-2">
                  <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-[11px]">
                    <span className="text-[9px] text-slate-400 block">祖父 (Sire's Sire)</span>
                    <span className="font-semibold text-slate-200">{horse.pedigree.sire?.sire?.nameZh || 'Northern Dancer'}</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-[11px]">
                    <span className="text-[9px] text-slate-400 block">祖母 (Sire's Dam)</span>
                    <span className="font-semibold text-slate-200">Wind in Her Hair</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-[11px]">
                    <span className="text-[9px] text-slate-400 block">外祖父 (Dam's Sire)</span>
                    <span className="font-semibold text-slate-200">Sunday Silence</span>
                  </div>
                  <div className="bg-slate-950/50 border border-slate-800 rounded p-2 text-[11px]">
                    <span className="text-[9px] text-slate-400 block">外祖母 (Dam's Dam)</span>
                    <span className="font-semibold text-slate-200">Starlet Wonder</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {/* Trophies */}
              {horse.trophies.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase font-bold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4" /> 贏得榮譽大賽錦標 ({horse.trophies.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {horse.trophies.map((t, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center gap-1">
                        🏆 {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Race History Table */}
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">歷史出賽紀錄</h4>
                {horse.raceHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                    此駒尚未有正式出賽紀錄，可於賽程中安排初出報名。
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">年份/周</th>
                          <th className="py-2.5 px-3">賽事名稱</th>
                          <th className="py-2.5 px-3">場地/途程</th>
                          <th className="py-2.5 px-3 text-center">名次</th>
                          <th className="py-2.5 px-3">騎師</th>
                          <th className="py-2.5 px-3">勝負距離</th>
                          <th className="py-2.5 px-3">時間</th>
                          <th className="py-2.5 px-3 text-right">獎金</th>
                          <th className="py-2.5 px-3 text-center">評分</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                        {horse.raceHistory.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 text-slate-400 font-mono">{item.year} W{item.week}</td>
                            <td className="py-2 px-3 font-semibold text-white">{item.raceName}</td>
                            <td className="py-2 px-3 text-slate-300">{item.track} {item.distance}m</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-block w-5 h-5 rounded-full text-xs font-bold leading-5 ${
                                item.placing === 1 ? 'bg-amber-400 text-slate-950' :
                                item.placing === 2 ? 'bg-slate-300 text-slate-950' :
                                item.placing === 3 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {item.placing}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300">{item.jockeyName}</td>
                            <td className="py-2 px-3 text-slate-400">{item.margin}</td>
                            <td className="py-2 px-3 font-mono text-slate-300">{item.time}</td>
                            <td className="py-2 px-3 text-right text-amber-300 font-mono">
                              HK${item.prizeMoney > 0 ? item.prizeMoney.toLocaleString() : '-'}
                            </td>
                            <td className="py-2 px-3 text-center font-bold">
                              {item.ratingChange > 0 ? (
                                <span className="text-emerald-400">+{item.ratingChange}</span>
                              ) : item.ratingChange < 0 ? (
                                <span className="text-rose-400">{item.ratingChange}</span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 p-4 flex justify-between items-center">
          <div className="text-xs text-slate-400">
            所在地：{horse.location === 'shatin' ? '沙田主馬房 🏙️' : horse.location === 'conghua' ? '從化溫泉訓練中心 ♨️' : '休養放草牧場 🌾'}
          </div>

          <div className="flex gap-2">
            {horse.isPlayerOwned && !horse.isRetired && (
              <>
                <button
                  onClick={() => { onClose(); setView('training'); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
                >
                  安排晨操
                </button>
                <button
                  onClick={() => { onClose(); setView('calendar'); }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  前往賽程報名
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
