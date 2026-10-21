import React, { useState } from 'react';
import { useGame } from '../engine/gameStore';
import { Trophy, Calendar, Coins, FastForward, Save, RefreshCw, Upload, Download, Sparkles, Menu } from 'lucide-react';

export const Header: React.FC<{ onOpenMobileMenu?: () => void }> = ({ onOpenMobileMenu }) => {
  const { state, setView, advanceWeek, restartNewGame, exportSaveJson, importSaveJson, pendingPlayerRaces } = useGame();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const { currentCalendar, playerFundsHKD, playerStableName } = state;
  const isRaceWeekend = currentCalendar.isRaceWeekend;

  const handleExport = () => {
    const json = exportSaveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WP10_HK_Save_${currentCalendar.year}_W${currentCalendar.week}.json`;
    a.click();
    setSaveStatus('存檔已成功導出為 JSON 檔案！');
  };

  const handleImport = () => {
    if (!importText) return;
    const res = importSaveJson(importText);
    if (res.success) {
      setSaveStatus('存檔讀取成功！');
      setTimeout(() => setShowSaveModal(false), 800);
    } else {
      setSaveStatus(`讀取失敗: ${res.reason}`);
    }
  };

  return (
    <>
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur sticky top-0 z-40 px-3 sm:px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          {/* Logo & Stable */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="選單"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-700 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/10 shrink-0">
              <span className="text-lg sm:text-xl">🏇</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-lg font-bold tracking-tight text-white flex items-center gap-1">
                  <span className="text-amber-400 font-extrabold">名馬大亨 10</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">HK 2026</span>
                </h1>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="truncate max-w-[120px] sm:max-w-none">{playerStableName}</span>
              </p>
            </div>
          </div>

          {/* Calendar & Location */}
          <div className="flex items-center gap-4 bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-200">{currentCalendar.season}</span>
              <span className="px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-bold text-xs">
                第 {currentCalendar.week} 周
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 border-l border-slate-700 pl-3">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>
                {currentCalendar.meetingLocation === 'happy_valley' ? '跑馬地周三夜賽 (9場) 🌙' : currentCalendar.meetingLocation === 'overseas' ? '海外遠征 ✈️' : '沙田週末日賽 (11場) ☀️'}
              </span>
            </div>
          </div>

          {/* Funds & Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Player Cash */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 px-3 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-amber-400" />
              <div className="text-right">
                <div className="text-[10px] text-amber-400/80 uppercase font-semibold leading-none">馬房儲備</div>
                <div className="text-sm sm:text-base font-extrabold text-amber-300 tracking-tight leading-none mt-0.5">
                  HK$ {(playerFundsHKD).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Advance Week Button */}
            <button
              onClick={() => advanceWeek()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-lg shadow-md shadow-emerald-900/40 active:scale-95 transition"
              title={
                pendingPlayerRaces.length > 0
                  ? `結算本周並推進至下一周 (${pendingPlayerRaces.length} 場已報名未跑嘅賽事會自動快速出賽)`
                  : '結算本周並推進至下一周'
              }
            >
              <FastForward className="w-4 h-4" />
              <span>推進下一周</span>
              {pendingPlayerRaces.length > 0 && (
                <span className="ml-0.5 px-1.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black leading-4">
                  {pendingPlayerRaces.length}
                </span>
              )}
            </button>

            {/* Save / Load / Config Button */}
            <button
              onClick={() => setShowSaveModal(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
              title="存檔 / 讀檔 / 重置"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Save / Load Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Save className="w-5 h-5 text-amber-400" />
                遊戲存檔與系統設定
              </h3>
              <button
                onClick={() => { setShowSaveModal(false); setSaveStatus(null); }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {saveStatus && (
              <div className="mb-4 p-3 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                {saveStatus}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">本機導出與備份</h4>
                <div className="flex gap-2">
                  <button
                    onClick={handleExport}
                    className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Download className="w-4 h-4" /> 下載備份 JSON
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase font-bold text-slate-400 mb-2">導入存檔 (JSON 貼上)</h4>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="在此粘貼導出的存檔 JSON 代碼..."
                  className="w-full h-24 bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-300 font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleImport}
                  className="w-full mt-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" /> 確認讀取存檔
                </button>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <button
                  onClick={() => {
                    if (confirm('確定要清除存檔並重開新一季馬房嗎？此操作不可逆！')) {
                      restartNewGame();
                      setShowSaveModal(false);
                    }
                  }}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> 重啟全新遊戲
                </button>

                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
