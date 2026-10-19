import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Horse } from '../../types/horse';
import { ShoppingBag, Coins, Sparkles, CheckCircle, AlertCircle, ArrowUpRight } from 'lucide-react';

interface MarketCandidate {
  horse: Horse;
  type: 'HKIS' | 'PPG' | 'PP';
  priceHKD: number;
  highlightZh: string;
}

export const HorseMarketScreen: React.FC = () => {
  const { state, buyHorse, setView } = useGame();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 市場拍賣馬匹名錄 (HKIS 幼駒與海外自購馬)
  const marketHorses: MarketCandidate[] = [
    {
      horse: {
        id: `market_hkis_${Date.now()}_1`,
        nameZh: '維港極光',
        nameEn: 'Aurora of Victoria',
        gender: 'colt',
        age: 2,
        color: '棗色',
        country: 'IRE',
        ownerId: '',
        ownerName: '',
        trainerId: 'trainer_tony_cruz',
        trainerName: '告東尼',
        isPlayerOwned: false,
        rating: 52,
        careerStarts: 0,
        wins: 0,
        seconds: 0,
        thirds: 0,
        totalPrizeMoney: 0,
        attributes: { speed: 80, stamina: 75, acceleration: 82, power: 78, guts: 82, intelligence: 78, temperament: 76, health: 88, flexibility: 80, consistency: 78 },
        geneticCeiling: { speed: 96, stamina: 92, acceleration: 97, power: 92, guts: 95, intelligence: 90, temperament: 88, health: 94, flexibility: 90, consistency: 88 },
        trainingProgress: {},
        runningStyle: 'stalker',
        preferredSurface: 'turf',
        surfaceAffinity: { turf: 96, dirt: 70 },
        optimalDistance: { min: 1400, max: 1800 },
        maturityType: 'normal',
        fitness: 85,
        fatigue: 0,
        morale: 85,
        isInjured: false,
        injuryWeeksRemaining: 0,
        location: 'shatin',
        pedigree: { id: 'p_av', nameZh: '維港極光', nameEn: 'Aurora of Victoria', sireLine: 'Acclamation系' },
        sireLine: 'Acclamation系',
        vitality: 88,
        dramaFactor: 55,
        dramaAchievements: [],
        raceHistory: [],
        trophies: [],
        marketValue: 8800000,
        isRetired: false,
      },
      type: 'HKIS',
      priceHKD: 7800000,
      highlightZh: '香港國際拍賣會焦點ロット！父系出自 Acclamation，步幅廣闊，極具大賽氣質。',
    },
    {
      horse: {
        id: `market_pp_${Date.now()}_2`,
        nameZh: '墨爾本快刀',
        nameEn: 'Melbourne Blade',
        gender: 'gelding',
        age: 4,
        color: '栗色',
        country: 'AUS',
        ownerId: '',
        ownerName: '',
        trainerId: 'trainer_danny_shum',
        trainerName: '沈集成',
        isPlayerOwned: false,
        rating: 78, // 自購馬初出已達三班頂尖！
        careerStarts: 6,
        wins: 2,
        seconds: 2,
        thirds: 1,
        totalPrizeMoney: 1200000,
        attributes: { speed: 85, stamina: 82, acceleration: 84, power: 86, guts: 87, intelligence: 82, temperament: 80, health: 90, flexibility: 84, consistency: 86 },
        geneticCeiling: { speed: 94, stamina: 90, acceleration: 93, power: 91, guts: 94, intelligence: 89, temperament: 86, health: 92, flexibility: 88, consistency: 89 },
        trainingProgress: {},
        runningStyle: 'midfield',
        preferredSurface: 'turf',
        surfaceAffinity: { turf: 94, dirt: 80 },
        optimalDistance: { min: 1600, max: 2000 },
        maturityType: 'normal',
        fitness: 90,
        fatigue: 0,
        morale: 88,
        isInjured: false,
        injuryWeeksRemaining: 0,
        location: 'shatin',
        pedigree: { id: 'p_mb', nameZh: '墨爾本快刀', nameEn: 'Melbourne Blade', sireLine: 'Danehill系' },
        sireLine: 'Danehill系',
        vitality: 82,
        dramaFactor: 60,
        dramaAchievements: ['澳洲表列賽冠軍自購馬'],
        raceHistory: [],
        trophies: [],
        marketValue: 12000000,
        isRetired: false,
      },
      type: 'PP',
      priceHKD: 11500000,
      highlightZh: '頂級海外自購馬 (PP)！在澳洲勝出兩歲及三歲錦標，抵港即評 78 分，直指四歲經典系列！',
    },
    {
      horse: {
        id: `market_ppg_${Date.now()}_3`,
        nameZh: '神風勁草',
        nameEn: 'Kamikaze Wind',
        gender: 'colt',
        age: 3,
        color: '灰馬',
        country: 'NZ',
        ownerId: '',
        ownerName: '',
        trainerId: 'trainer_david_hayes',
        trainerName: '大衛希斯',
        isPlayerOwned: false,
        rating: 52,
        careerStarts: 0,
        wins: 0,
        seconds: 0,
        thirds: 0,
        totalPrizeMoney: 0,
        attributes: { speed: 79, stamina: 70, acceleration: 83, power: 75, guts: 78, intelligence: 76, temperament: 75, health: 86, flexibility: 78, consistency: 76 },
        geneticCeiling: { speed: 95, stamina: 82, acceleration: 96, power: 88, guts: 90, intelligence: 85, temperament: 82, health: 90, flexibility: 82, consistency: 84 },
        trainingProgress: {},
        runningStyle: 'front_runner',
        preferredSurface: 'turf',
        surfaceAffinity: { turf: 95, dirt: 85 },
        optimalDistance: { min: 1000, max: 1200 },
        maturityType: 'early',
        fitness: 84,
        fatigue: 0,
        morale: 82,
        isInjured: false,
        injuryWeeksRemaining: 0,
        location: 'shatin',
        pedigree: { id: 'p_kw', nameZh: '神風勁草', nameEn: 'Kamikaze Wind', sireLine: 'Shamexpress系' },
        sireLine: 'Shamexpress系',
        vitality: 80,
        dramaFactor: 45,
        dramaAchievements: [],
        raceHistory: [],
        trophies: [],
        marketValue: 6500000,
        isRetired: false,
      },
      type: 'PPG',
      priceHKD: 5800000,
      highlightZh: '自購新馬 (PPG) 短途奇兵！初出評 52 分，早熟爆發力強，極速搶攻四班賽事。',
    }
  ];

  const handlePurchase = (candidate: MarketCandidate) => {
    if (state.playerFundsHKD < candidate.priceHKD) {
      setErrorMsg(`資金不足！此駒售價 HK$${candidate.priceHKD.toLocaleString()}，馬房現有 HK$${state.playerFundsHKD.toLocaleString()}`);
      return;
    }

    const res = buyHorse(candidate.horse, candidate.priceHKD);
    if (res.success) {
      setSuccessMsg(`🎉 恭喜！成功購入賽駒【${candidate.horse.nameZh}】！已進駐馬房。`);
      setErrorMsg(null);
    } else {
      setErrorMsg(res.reason || '購買失敗');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className="w-5 h-5 text-orange-400" />
            <span className="text-xs text-orange-300 font-bold uppercase">香港賽馬會拍賣會與自購馬交易市場</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            香港國際馬匹拍賣會 (HKIS & Horse Trading)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            引進歐洲及南半球頂級名門血統幼駒 (HKIS / PPG) 與高評分實力自購馬 (PP)
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
          <Coins className="w-4 h-4 text-amber-400" />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">可用資金</span>
            <span className="text-sm font-black text-amber-300">
              HK$ {state.playerFundsHKD.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 shadow">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setView('my_horses')} className="font-bold underline">
            查看我的馬房 →
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Market Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {marketHorses.map((item) => (
          <div
            key={item.horse.id}
            className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between transition shadow-lg"
          >
            <div>
              {/* Type Badge & Country */}
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  item.type === 'HKIS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  item.type === 'PP' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                  'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {item.type === 'HKIS' ? '香港國際拍賣會 (HKIS)' : item.type === 'PP' ? '精選自購馬 (PP)' : '自購新馬 (PPG)'}
                </span>

                <span className="text-xs font-bold text-slate-400">
                  {item.horse.age}歲 {item.horse.gender === 'colt' ? '雄馬' : item.horse.gender === 'filly' ? '雌馬' : '閹馬'} • {item.horse.country}
                </span>
              </div>

              <h3 className="text-xl font-black text-white">{item.horse.nameZh}</h3>
              <p className="text-xs text-slate-400 font-serif italic mb-3">{item.horse.nameEn}</p>

              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mb-3 leading-relaxed">
                {item.highlightZh}
              </p>

              {/* Attributes & Ceilings */}
              <div className="space-y-1.5 text-xs py-2 border-t border-slate-800 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">起步評分：</span>
                  <span className="font-extrabold text-amber-300">{item.horse.rating} 分</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">速度上限潛力：</span>
                  <span className="font-extrabold text-white">{item.horse.geneticCeiling.speed} 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">爆發上限潛力：</span>
                  <span className="font-extrabold text-white">{item.horse.geneticCeiling.acceleration} 點</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">合適途程：</span>
                  <span className="font-semibold text-slate-200">{item.horse.optimalDistance.min}-{item.horse.optimalDistance.max} 米</span>
                </div>
              </div>
            </div>

            {/* Price & Buy Button */}
            <div className="pt-3 border-t border-slate-800 flex justify-between items-center gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">售價 / 中標估價</span>
                <span className="text-lg font-black text-amber-300">
                  HK${(item.priceHKD / 10000).toFixed(0)}萬
                </span>
              </div>

              {state.horses.some(h => h.nameZh === item.horse.nameZh && h.isPlayerOwned) ? (
                <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> 已進駐馬房
                </span>
              ) : (
                <button
                  onClick={() => handlePurchase(item)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs shadow-md active:scale-95 transition"
                >
                  出價購入
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
