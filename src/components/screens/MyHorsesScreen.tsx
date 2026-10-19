import React, { useState } from 'react';
import { useGame } from '../../engine/gameStore';
import { Horse } from '../../types/horse';
import { HorseDetailModal } from './HorseDetailModal';
import { Shield, Trophy, Activity, Dumbbell, Calendar, Heart, Award } from 'lucide-react';

export const MyHorsesScreen: React.FC = () => {
  const { state, setView } = useGame();
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'retired'>('active');

  const playerHorses = state.horses.filter((h) => {
    if (!h.isPlayerOwned) return false;
    if (filterMode === 'active') return !h.isRetired;
    if (filterMode === 'retired') return h.isRetired;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-amber-400" />
            <span className="text-xs text-amber-300 font-bold uppercase">{state.playerStableName} 陣容</span>
          </div>
          <h2 className="text-2xl font-black text-white">
            我的賽駒名冊 ({playerHorses.length} 匹)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            全面管理名下賽駒狀態、晨操進度、血統傳承與退役規劃
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setFilterMode('active')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterMode === 'active' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            現役賽駒 ({state.horses.filter(h => h.isPlayerOwned && !h.isRetired).length})
          </button>
          <button
            onClick={() => setFilterMode('retired')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterMode === 'retired' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            退役繁育駒 ({state.horses.filter(h => h.isPlayerOwned && h.isRetired).length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterMode === 'all' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            全部馬匹
          </button>
        </div>
      </div>

      {/* Horse Grid */}
      {playerHorses.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="text-4xl">🏇</div>
          <h3 className="text-lg font-bold text-white">暫無符合條件之賽駒</h3>
          <p className="text-xs text-slate-400">可前往香港國際拍賣會 (HKIS) 競逐優質幼駒或購入自購馬！</p>
          <button
            onClick={() => setView('market')}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
          >
            前往拍賣市場
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {playerHorses.map((horse) => {
            const getRatingClass = (r: number) => {
              if (r >= 100) return '分級賽/精英班';
              if (r >= 80) return '第二班 (Class 2)';
              if (r >= 60) return '第三班 (Class 3)';
              if (r >= 40) return '第四班 (Class 4)';
              return '第五班 (Class 5)';
            };

            return (
              <div
                key={horse.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 flex flex-col justify-between transition shadow-lg group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                      {horse.age}歲 {horse.gender === 'colt' ? '雄馬' : horse.gender === 'filly' ? '雌馬' : '閹馬'} • {horse.country}
                    </span>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">HKJC 評分</span>
                      <span className="text-lg font-black text-amber-300 leading-none">
                        {horse.rating} 分
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <h3
                    onClick={() => setSelectedHorse(horse)}
                    className="text-lg font-black text-white group-hover:text-amber-300 cursor-pointer transition flex items-center justify-between"
                  >
                    <span>{horse.nameZh}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      {getRatingClass(horse.rating)}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-serif italic mb-3">{horse.nameEn}</p>

                  {/* Key Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2.5 border-y border-slate-800/80 text-slate-300 mb-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">生涯戰績</span>
                      <span className="font-bold text-white">
                        {horse.careerStarts}戰 {horse.wins}冠 {horse.seconds}亞 {horse.thirds}季
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">累積獎金</span>
                      <span className="font-bold text-amber-300">
                        HK${horse.totalPrizeMoney > 0 ? (horse.totalPrizeMoney / 10000).toFixed(0) + '萬' : '0'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">合適途程</span>
                      <span className="font-semibold text-slate-200">
                        {horse.optimalDistance.min}-{horse.optimalDistance.max} 米
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">跑法偏好</span>
                      <span className="font-semibold text-slate-200">
                        {horse.runningStyle === 'front_runner' ? '領放' : horse.runningStyle === 'stalker' ? '前領' : horse.runningStyle === 'midfield' ? '居中' : '後勁'}
                      </span>
                    </div>
                  </div>

                  {/* Condition & Fatigue Meters */}
                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">競賽狀態 (Fitness)</span>
                        <span className="font-bold text-emerald-400">{horse.fitness}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${horse.fitness}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">疲勞度 (Fatigue)</span>
                        <span className={`font-bold ${horse.fatigue > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {horse.fatigue}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${horse.fatigue > 60 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${horse.fatigue}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setSelectedHorse(horse)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
                  >
                    詳細檔案
                  </button>
                  <button
                    onClick={() => setView('training')}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-violet-300 text-xs font-bold rounded-xl transition flex items-center gap-1"
                    title="前往調教訓練"
                  >
                    <Dumbbell className="w-3.5 h-3.5" /> 晨操
                  </button>
                  <button
                    onClick={() => setView('calendar')}
                    className="py-2 px-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 text-xs font-black rounded-xl transition shadow"
                    title="報名出賽"
                  >
                    報名
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Horse Detail Modal */}
      {selectedHorse && (
        <HorseDetailModal
          horse={selectedHorse}
          onClose={() => setSelectedHorse(null)}
        />
      )}
    </div>
  );
};
