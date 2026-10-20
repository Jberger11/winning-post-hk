import React, { useState } from 'react';
import { useGame } from '../engine/gameStore';
import { GameView } from '../types/game';
import {
  LayoutDashboard,
  Shield,
  Calendar,
  PlaySquare,
  Dumbbell,
  Dna,
  ShoppingBag,
  Building2,
  Users,
  Trophy,
  DollarSign,
  Menu,
  X
} from 'lucide-react';

interface NavItem {
  id: GameView;
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  badge?: number | string;
  group: string;
}

import { SEASON_OBJECTIVES, getObjectiveProgress } from '../engine/seasonObjectives';

export const Sidebar: React.FC<{ isOpenMobile?: boolean; onCloseMobile?: () => void }> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const { state, setView } = useGame();
  const current = state.currentView;

  const playerHorsesCount = state.horses.filter(h => h.isPlayerOwned && !h.isRetired).length;
  const currentWeekRacesCount = state.scheduledRaces.length;
  const claimableObjectives = getObjectiveProgress(state).filter(o => o.complete && !o.claimed).length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: '大本營總覽',
      subLabel: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: claimableObjectives > 0 ? `${claimableObjectives} 目標可領獎` : undefined,
      group: '總覽',
    },
    {
      id: 'my_horses',
      label: '我的賽駒',
      subLabel: 'My Stable',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      badge: playerHorsesCount,
      group: '馬房管理',
    },
    {
      id: 'calendar',
      label: '賽程排位',
      subLabel: 'Race Fixtures',
      icon: <Calendar className="w-4 h-4 text-sky-400" />,
      badge: currentWeekRacesCount > 0 ? `${currentWeekRacesCount} 場` : undefined,
      group: '賽事',
    },
    {
      id: 'live_race',
      label: '即時實況賽事',
      subLabel: 'Live Race Simulation',
      icon: <PlaySquare className="w-4 h-4 text-emerald-400" />,
      group: '賽事',
    },
    {
      id: 'training',
      label: '晨操與從化調教',
      subLabel: 'Trackwork & Conghua',
      icon: <Dumbbell className="w-4 h-4 text-violet-400" />,
      group: '馬房管理',
    },
    {
      id: 'breeding',
      label: '血統配種中心',
      subLabel: 'WP10 2026 Breeding',
      icon: <Dna className="w-4 h-4 text-pink-400" />,
      group: '馬房管理',
    },
    {
      id: 'market',
      label: '香港國際拍賣會',
      subLabel: 'HKIS & PP/PPG',
      icon: <ShoppingBag className="w-4 h-4 text-orange-400" />,
      group: '馬房管理',
    },
    {
      id: 'facilities',
      label: '從化基地擴建',
      subLabel: 'Facilities Upgrade',
      icon: <Building2 className="w-4 h-4 text-teal-400" />,
      group: '馬房管理',
    },
    {
      id: 'jockeys_trainers',
      label: '騎師與練馬師',
      subLabel: 'Jockeys & Trainers',
      icon: <Users className="w-4 h-4 text-blue-400" />,
      group: '人脈與榮譽',
    },
    {
      id: 'rankings',
      label: '馬王榜與名人堂',
      subLabel: 'Hall of Fame',
      icon: <Trophy className="w-4 h-4 text-yellow-400" />,
      group: '人脈與榮譽',
    },
    {
      id: 'finances',
      label: '馬房財務報表',
      subLabel: 'Financial Ledger',
      icon: <DollarSign className="w-4 h-4 text-lime-400" />,
      group: '人脈與榮譽',
    },
  ];

  const handleSelect = (id: GameView) => {
    setView(id);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="p-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>馬房營運選單</span>
        <span className="text-[10px] text-amber-500/80 font-mono">WP10 HK</span>
      </div>

      <nav className="flex-1 px-2 space-y-1 pb-6 overflow-y-auto">
        {navItems.map((item, itemIdx) => {
          const isActive = current === item.id;
          const showGroupHeader = itemIdx === 0 || navItems[itemIdx - 1].group !== item.group;
          return (
            <React.Fragment key={item.id}>
            {showGroupHeader && (
              <div className="px-3 pt-3 pb-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
                {item.group}
              </div>
            )}
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-slate-800 text-amber-300 font-bold border-l-4 border-amber-400 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <div className="text-left leading-tight">
                  <div className="text-[13px]">{item.label}</div>
                  {item.subLabel && (
                    <div className="text-[10px] text-slate-400 font-sans">{item.subLabel}</div>
                  )}
                </div>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
            </React.Fragment>
          );
        })}
      </nav>

      <div className="p-3.5 bg-slate-950/70 border-t border-slate-800/80">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black text-white truncate">🏇 {state.playerStableName}</span>
          <span className="text-[10px] font-mono text-amber-300 shrink-0">
            第 {state.currentCalendar.week} 周
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5 text-[11px]">
          <span className="text-slate-400">資金</span>
          <span className="font-bold text-amber-300">HK${state.playerFundsHKD.toLocaleString()}</span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>馬房聲望</span>
            <span className="font-bold text-sky-300">{state.stableReputation ?? 58} / 100</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-amber-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(0, state.stableReputation ?? 58))}%` }}
            />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-400">
          <span>賽季目標</span>
          <span className="font-bold text-emerald-300">
            {(state.claimedObjectiveIds || []).length} / {SEASON_OBJECTIVES.length} 已領獎
            {claimableObjectives > 0 ? ` ・ ${claimableObjectives} 個可領取` : ''}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-slate-900/95 border-r border-slate-800 flex-col shrink-0 min-h-[calc(100vh-61px)]">
        {navContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex">
          <div className="w-72 bg-slate-900 h-full border-r border-slate-800 flex flex-col shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex justify-between items-center">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>🏇</span>
                <span>名馬大亨 10 HK</span>
              </span>
              <button
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
            {navContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
