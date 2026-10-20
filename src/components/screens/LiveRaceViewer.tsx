// ==========================================
// 賽馬 2.5D 電視直播觀賽器 (Live Race Broadcast Viewer)
// 靈感源自 Winning Post 10 2026 頂級視效與香港賽馬會官方實況轉播
// 支援 4 款動態鏡頭、骨骼關節奔馳動畫、草地泥屑粒子、原生 Web Audio 音效
// ==========================================

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useGame } from '../../engine/gameStore';
import { RaceSimulationResult, HorseSimulationState } from '../../types/race';
import { RaceResultModal } from './RaceResultModal';
import {
  CameraMode,
  drawHeadOnFinishCam,
  drawTacticalDroneCam,
} from '../../engine/raceCanvasRenderer';
import { buildRacePath, venueFromCourseName } from '../../engine/courseGeometry';
import { drawCourseView } from '../../engine/courseRenderer';
import { drawSideTrackingView } from '../../engine/sideViewRenderer';
import { raceSoundEngine } from '../../engine/soundEngine';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Trophy,
  Video,
  Eye,
  Flag,
  Crosshair,
  Tv,
  Sparkles,
  Box,
} from 'lucide-react';

const ThreeRaceView = lazy(() =>
  import('./ThreeRaceView').then((m) => ({ default: m.ThreeRaceView }))
);

// 與 2D 繪製器相同的毛色色板 (按檔位)
const COAT_PALETTE = ['#451a03', '#78350f', '#292524', '#57534e', '#92400e', '#3f1d0b'];

export const LiveRaceViewer: React.FC = () => {
  const { state, setView, issueTacticalCommand } = useGame();
  const simResult: RaceSimulationResult | null = state.currentSimulationResult;

  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [cameraMode, setCameraMode] = useState<CameraMode>('3d');
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 400 });
  const [isMuted, setIsMuted] = useState<boolean>(raceSoundEngine.getMuted());
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [lastCommandNotice, setLastCommandNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 識別玩家擁有賽駒
  const playerHorseIds = new Set(
    state.horses.filter((h) => h.isPlayerOwned).map((h) => h.id)
  );

  // 待機畫面 (若無模擬結果)
  if (!simResult || !simResult.replayFrames || simResult.replayFrames.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 mx-auto flex items-center justify-center text-3xl shadow-inner">
          🏇
        </div>
        <h3 className="text-xl font-bold text-white">尚無進行中的賽事直播</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          請於賽事日程中選擇沙田或跑馬地賽事，點擊「實況模擬」即可在此體驗 Winning Post 10 2026 風格的真實電視轉播！
        </p>
        <button
          onClick={() => setView('calendar')}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition"
        >
          前往賽程排位
        </button>
      </div>
    );
  }

  const frames = simResult.replayFrames;
  const currentFrame = frames[Math.min(frameIndex, frames.length - 1)];
  const isFinished = frameIndex >= frames.length - 1;
  const totalDist = simResult.distance;

  // 實況評述 feed：累積去到目前幀為止的所有評述句 (新句在前)
  const feedLines = (() => {
    const upto = Math.min(frameIndex, frames.length - 1);
    const lines: Array<{ t: number; text: string; remain: number }> = [];
    for (let i = 0; i <= upto; i++) {
      const f = frames[i];
      if (f.commentary) {
        const lead = f.horses.reduce((m, x) => Math.max(m, x.currentDistance), 0);
        lines.push({
          t: f.timestamp,
          text: f.commentary,
          remain: Math.max(0, Math.round(totalDist - lead)),
        });
      }
    }
    return lines.reverse();
  })();

  // 頂部橫額顯示最近一句評述；開賽前未有評述時才用即時走位生成句
  const displayCommentary = (() => {
    if (feedLines.length > 0) return feedLines[0].text;
    if (!currentFrame) return '各駒入閘完畢，旗號揚起！';
    const hs = [...currentFrame.horses].sort((a, b) => a.rank - b.rank);
    const leader = hs[0];
    if (!leader) return '賽事進行中。';
    const second = hs[1];
    const remaining = Math.max(0, Math.round(totalDist - leader.currentDistance));
    const gapLen = second
      ? ((leader.currentDistance - second.currentDistance) / 2.4).toFixed(1)
      : '0';
    const mine = hs.find((h) => playerHorseIds.has(h.horseId));
    const mineTxt =
      mine && mine.horseId !== leader.horseId
        ? `，你嘅【${mine.horseNameZh}】而家排第 ${mine.rank} 位`
        : '';
    if (currentFrame.timestamp < 2) return '各駒入閘完畢，旗號揚起！開閘一刻萬馬奔騰！';
    if (remaining <= 0) return `【${leader.horseNameZh}】率先衝過終點！`;
    if (remaining <= 200)
      return `最後 ${remaining} 米！【${leader.horseNameZh}】領先 ${gapLen} 個馬位，全力衝線${mineTxt}！`;
    if (remaining <= 450)
      return `進入直路！【${leader.horseNameZh}】帶頭，領先 ${gapLen} 個馬位${mineTxt}。`;
    return `【${leader.horseNameZh}】暫時領先 ${gapLen} 個馬位，尚餘 ${remaining} 米${mineTxt}。`;
  })();

  // 聲音控制：開始出閘與環境音
  useEffect(() => {
    if (isPlaying && !isFinished) {
      if (frameIndex === 0) {
        raceSoundEngine.playGateBell();
      }
      raceSoundEngine.startHooves(playbackSpeed);

      const leaderDist = currentFrame?.horses[0]?.currentDistance || 0;
      const remainDist = totalDist - leaderDist;
      if (remainDist <= 400 && remainDist > 150) {
        raceSoundEngine.startCrowd(0.4);
      } else if (remainDist <= 150) {
        raceSoundEngine.updateCrowd(0.9);
      }
    } else {
      raceSoundEngine.stopAmbientSounds();
      if (isFinished && frameIndex >= frames.length - 1) {
        raceSoundEngine.playFinishFanfare();
      }
    }

    return () => {
      raceSoundEngine.stopAmbientSounds();
    };
  }, [isPlaying, isFinished, playbackSpeed, frameIndex, currentFrame, totalDist]);

  // 賽事衝線完畢時延遲彈出賽果報告
  useEffect(() => {
    if (isFinished && !isPlaying && frameIndex >= frames.length - 1) {
      const finishTimer = setTimeout(() => {
        setShowResultModal(true);
      }, 1000);
      return () => clearTimeout(finishTimer);
    }
  }, [isFinished, isPlaying, frameIndex, frames.length]);

  // 幀推進定時器
  useEffect(() => {
    if (!isPlaying || isFinished) return;

    const intervalMs = Math.round(180 / playbackSpeed);
    const timer = setInterval(() => {
      setFrameIndex((prev) => {
        if (prev + 1 >= frames.length) {
          setIsPlaying(false);
          return frames.length - 1;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, isFinished, frames.length, playbackSpeed]);

  // 自適應畫布：跟容器闊度 + 裝置像素比調整實際解析度；
  // 手機直度時用更高畫面比例 (0.68)，唔再將 960x400 成幅壓扁到睇唔到
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.parentElement) return;
    const parent = canvas.parentElement;
    const apply = () => {
      const cssW = parent.clientWidth;
      if (cssW < 50) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const aspect = cssW >= 768 ? 400 / 960 : 0.68;
      const w = Math.round(cssW * dpr);
      const h = Math.round(cssW * dpr * aspect);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        setCanvasSize({ w, h });
      }
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  // 畫布渲染循環 (60 FPS 渲染循環與視角跟隨)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentFrame) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const isDirt = simResult.surface === 'dirt';

    // 清屏
    ctx.clearRect(0, 0, width, height);

    // 視角 0：直播追蹤側面鏡頭 (TV Side Tracking Cam, v2026.4.0)
    if (cameraMode === 'side') {
      drawSideTrackingView(ctx, {
        width,
        height,
        horses: currentFrame.horses,
        totalDist,
        isDirt,
        isNight: simResult.courseNameZh.includes('跑馬地'),
        venueNameZh: simResult.courseNameZh,
        playerHorseIds,
        selectedHorseId,
      });
      return;
    }

    // 視角 1：直路衝線正面鏡頭 (Head-On Finish Cam)
    if (cameraMode === 'finish') {
      drawHeadOnFinishCam(
        ctx,
        width,
        height,
        currentFrame.horses,
        totalDist,
        isDirt,
        playerHorseIds
      );
      return;
    }

    // 視角 2：戰術無人機俯瞰 (Tactical Drone Cam)
    if (cameraMode === 'tactical') {
      drawTacticalDroneCam(
        ctx,
        width,
        height,
        currentFrame.horses,
        totalDist,
        isDirt,
        playerHorseIds,
        selectedHorseId
      );
      return;
    }

    // 視角 3 & 4：賽道全景 (Course View) & 愛駒追蹤 (Course Zoom)
    // v2026.3.1: 賽道改為真實環形走線 (直路 + 彎位)，起點按途程倒推，
    // 不再是直線橫移畫面。愛駒追蹤 = 全景賽道上 zoom 跟拍自家馬。
    const racePath = buildRacePath(venueFromCourseName(simResult.courseNameZh), totalDist);
    let focusPoint: { x: number; y: number } | null = null;
    if (cameraMode === 'player') {
      const focusHorse =
        currentFrame.horses.find((h) => playerHorseIds.has(h.horseId)) ||
        (selectedHorseId ? currentFrame.horses.find((h) => h.horseId === selectedHorseId) : undefined) ||
        currentFrame.horses[0];
      if (focusHorse) focusPoint = racePath.pointAtRace(focusHorse.currentDistance);
    }
    drawCourseView(ctx, {
      width,
      height,
      path: racePath,
      horses: currentFrame.horses,
      totalDist,
      isDirt,
      isNight: simResult.courseNameZh.includes('跑馬地'),
      venueNameZh: simResult.courseNameZh,
      playerHorseIds,
      selectedHorseId,
      focusPoint: cameraMode === 'player' ? focusPoint : null,
    });
    return;
  }, [currentFrame, cameraMode, selectedHorseId, simResult, totalDist, canvasSize]);

  const toggleSound = () => {
    const muted = raceSoundEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* HKJC Official Style Broadcast TV Top Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/90 text-white text-[11px] font-black uppercase tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white"></span>
            LIVE 轉播
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] px-2 py-0.5 rounded font-black bg-purple-900/60 text-purple-300 border border-purple-500/40">
                {simResult.raceGrade}
              </span>
              <span className="text-xs text-slate-400">
                {simResult.courseNameZh} • {simResult.distance}米 • {simResult.surface === 'turf' ? '草地' : '泥地'} (好地 Good)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {simResult.raceNameZh}
            </h2>
          </div>
        </div>

        {/* Live Controls Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mute Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
              isMuted
                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
            }`}
            title={isMuted ? '開啟現場音效' : '靜音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isMuted ? '靜音' : '音效'}</span>
          </button>

          {/* Camera Modes Switcher */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
            {[
              { id: '3d', label: '3D 立體', icon: Box },
              { id: 'side', label: '直播追蹤', icon: Tv },
              { id: 'broadcast', label: '賽道全景', icon: Video },
              { id: 'player', label: '愛駒追蹤', icon: Crosshair },
              { id: 'finish', label: '直路衝線', icon: Flag },
              { id: 'tactical', label: '戰術無人機', icon: Eye },
            ].map((cam) => {
              const Icon = cam.icon;
              return (
                <button
                  key={cam.id}
                  onClick={() => setCameraMode(cam.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1 ${
                    cameraMode === cam.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{cam.label}</span>
                </button>
              );
            })}
          </div>

          {/* Speed Selector */}
          <button
            onClick={() => setPlaybackSpeed((s) => (s === 1.0 ? 1.5 : s === 1.5 ? 2.5 : 1.0))}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-slate-700"
            title="調整倍速"
          >
            {playbackSpeed}x 速
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => {
              if (isFinished || frameIndex >= frames.length - 1) {
                setFrameIndex(0);
                setShowResultModal(false);
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition border border-slate-700 active:scale-95"
            title={isPlaying ? '暫停' : '播放'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Reset */}
          <button
            onClick={() => {
              setFrameIndex(0);
              setShowResultModal(false);
              setIsPlaying(true);
            }}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700 active:scale-95"
            title="重新播放"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Skip to Finish */}
          <button
            onClick={() => {
              setFrameIndex(frames.length - 1);
              setIsPlaying(false);
              setShowResultModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs transition flex items-center gap-1 shadow-md active:scale-95"
          >
            <SkipForward className="w-4 h-4" />
            <span className="hidden sm:inline">即時看賽果</span>
          </button>
        </div>
      </div>

      {/* Race Finished Banner */}
      {isFinished && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-amber-950/80 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center text-2xl shadow-lg shrink-0">
              🏆
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-black border border-emerald-500/40">
                  ✅ 賽事已完賽 (Race Completed)
                </span>
                <span className="text-xs text-slate-400">
                  頭馬時間：<span className="font-mono text-amber-300 font-bold">{simResult.winningTime}</span>
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                恭喜頭馬：【{simResult.placings[0]?.horseNameZh}】勇奪桂冠！
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
            <button
              onClick={() => {
                setFrameIndex(0);
                setShowResultModal(false);
                setIsPlaying(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition flex items-center gap-1 border border-slate-700 active:scale-95"
              title="重新從起步點重播實況"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重溫實況</span>
            </button>
            <button
              onClick={() => setShowResultModal(true)}
              className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Trophy className="w-4 h-4" />
              <span>查看詳細賽果報告</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
            >
              返回賽程表
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition active:scale-95"
            >
              返回大本營
            </button>
          </div>
        </div>
      )}

      {/* 臨場戰術指揮面板 (Tactical Command Deck) */}
      <div className="bg-slate-900/95 border border-amber-500/40 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-black text-xs shrink-0">
            🎯 臨場戰術指揮
          </span>
          <div className="text-xs text-slate-300">
            {lastCommandNotice ? (
              <span className="text-emerald-400 font-bold">{lastCommandNotice}</span>
            ) : (
              <span>向鞍上人下達即時走位與留放指令，重組賽事步速與衝刺路線：</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'front_runner' as const, label: '⚡ 貼欄快放搶欄', desc: '早段搶出貼欄領放' },
            { id: 'stalker' as const, label: '🛡️ 守二疊好位', desc: '跟隨領放馬遮擋慳位' },
            { id: 'midfield' as const, label: '🌀 中段順勢推進', desc: '留放均速入彎發力' },
            { id: 'closer' as const, label: '🔥 大外一氣衝刺', desc: '留後蓄力直路橫掃' },
          ].map((cmd) => {
            const targetHorseId =
              currentFrame?.horses.find((h) => playerHorseIds.has(h.horseId))?.horseId ||
              selectedHorseId ||
              currentFrame?.horses[0]?.horseId ||
              '';
            return (
              <button
                key={cmd.id}
                onClick={() => {
                  if (!targetHorseId) return;
                  issueTacticalCommand(simResult.raceId, targetHorseId, cmd.id, cmd.label);
                  setLastCommandNotice(`已下達「${cmd.label}」— 已記錄作賽後檢討，並成為該駒之後出賽的預設跑法。`);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-amber-500 hover:text-slate-950 text-amber-300 border border-amber-500/40 font-black text-xs transition active:scale-95"
                title={cmd.desc}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2.5D Canvas Viewport */}
      <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        {cameraMode === '3d' ? (
          <Suspense
            fallback={
              <div
                className="w-full flex items-center justify-center bg-slate-900 text-slate-300 text-sm font-bold"
                style={{ height: 400 }}
              >
                載入 3D 場景中…
              </div>
            }
          >
            <ThreeRaceView
              venueKey={venueFromCourseName(simResult.courseNameZh)}
              totalDist={totalDist}
              isNight={simResult.courseNameZh.includes('跑馬地')}
              isDirt={simResult.surface === 'dirt'}
              runners={(simResult.entries || []).map((e) => ({
                id: e.horseId,
                cloth: e.numberCloth,
                coat: COAT_PALETTE[(e.gate - 1 + COAT_PALETTE.length) % COAT_PALETTE.length],
                silk: e.silkColor,
                isPlayer: playerHorseIds.has(e.horseId),
              }))}
              positions={(currentFrame?.horses || []).map((h) => ({
                id: h.horseId,
                distance: h.currentDistance,
                lane: h.lane,
                sprint: h.isSprinting,
              }))}
              selectedHorseId={selectedHorseId}
              resetKey={simResult.raceId}
              onUnavailable={() => setCameraMode('side')}
            />
          </Suspense>
        ) : (
          <canvas
            ref={canvasRef}
            width={960}
            height={400}
            className="w-full h-auto block"
          />
        )}

        {/* HKJC Official Style TV Commentary Bar */}
        <div className="absolute top-3 left-3 right-3 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur border border-amber-500/40 rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-xl">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-amber-300 font-black tracking-wide truncate">
                {displayCommentary}
              </span>
            </div>
            <div className="font-mono text-slate-300 font-bold text-xs shrink-0">
              ⏱️ {currentFrame?.timestamp.toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Sectional Split Times HUD (分段時間) */}
        <div className="absolute top-14 right-3 pointer-events-none hidden sm:flex items-center gap-1.5 text-[10px] font-mono font-bold">
          <div className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            首段 400m: <span className="text-amber-300">23.82s</span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            中段: <span className="text-amber-300">22.45s</span>
          </div>
          <div className="bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-md border border-slate-800 text-slate-300">
            直路衝刺: <span className="text-emerald-400">21.80s</span>
          </div>
        </div>

        {/* 即時位置標示 (參考轉播畫面頂部：號碼按走位沿線排列) */}
        {currentFrame && currentFrame.horses.length > 1 && (
          <div className="absolute left-3 right-3 pointer-events-none" style={{ top: 88 }}>
            <div className="relative h-6">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/25" />
              {(() => {
                const hs = currentFrame.horses;
                const dists = hs.map((h) => h.currentDistance);
                const minD = Math.min(...dists);
                const maxD = Math.max(...dists);
                const spread = maxD - minD;
                // 圓點太接近時上下錯開，避免號碼疊住
                const withPct = hs.map((h) => ({
                  h,
                  pct:
                    spread > 1
                      ? 2 + 96 * ((h.currentDistance - minD) / spread)
                      : 2 + 96 * ((hs.length - h.rank) / Math.max(1, hs.length - 1)),
                }));
                const dyMap = new Map<string, number>();
                {
                  let prevPct = -99;
                  let alt = 0;
                  for (const it of [...withPct].sort((a, b) => a.pct - b.pct)) {
                    if (it.pct - prevPct < 2.8) alt = alt === 0 ? -12 : 0;
                    else alt = 0;
                    dyMap.set(it.h.horseId, alt);
                    prevPct = it.pct;
                  }
                }
                return withPct.map(({ h, pct }) => {
                  const isLeader = h.rank === 1;
                  const isPlayer = playerHorseIds.has(h.horseId);
                  return (
                    <span
                      key={h.horseId}
                      title={`${h.numberCloth} ${h.horseNameZh}`}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border flex items-center justify-center font-black ${
                        isLeader
                          ? 'w-6 h-6 text-[10px] border-amber-300 ring-2 ring-amber-400/70 z-10'
                          : 'w-5 h-5 text-[9px] border-white/70'
                      } ${isPlayer ? 'ring-2 ring-amber-500/80' : ''}`}
                      style={{
                        left: `${pct}%`,
                        marginTop: dyMap.get(h.horseId) ?? 0,
                        backgroundColor: h.silkColor || '#64748b',
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {h.numberCloth}
                    </span>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* Live Ticker: 前五名即時走勢 + 玩家馬位置 (電視轉播式跑馬燈) */}
        <div className="absolute bottom-12 left-4 right-4 pointer-events-none hidden md:flex flex-wrap items-center gap-1.5">
          {(() => {
            const ordered = [...(currentFrame?.horses || [])].sort((a, b) => a.rank - b.rank);
            const leaderDist = ordered[0]?.currentDistance || 0;
            // 電視轉播式: 下方走勢帶列晒全場 (號碼 + 馬名 + 差距)，賽道上只顯示號碼
            const chips = ordered;
            return chips.map((h) => {
              const gapLengths = Math.max(0, (leaderDist - h.currentDistance) / 2.5);
              const isPlayer = playerHorseIds.has(h.horseId);
              return (
                <span
                  key={h.horseId}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold backdrop-blur border ${
                    isPlayer
                      ? 'bg-amber-500/85 text-slate-950 border-amber-300'
                      : 'bg-slate-950/80 text-slate-200 border-slate-700'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-black text-white border border-white/50"
                    style={{ backgroundColor: h.silkColor || '#64748b' }}
                  >
                    {h.numberCloth}
                  </span>
                  {h.rank}. {h.horseNameZh}
                  <span className="font-mono opacity-80">
                    {h.rank === 1 ? '領先' : `+${gapLengths.toFixed(1)}馬位`}
                  </span>
                  {h.isBlocked && <span className="text-red-400">受阻</span>}
                </span>
              );
            });
          })()}
        </div>

        {/* Bottom Timeline Scrubber */}
        <div className="absolute bottom-2 left-4 right-4 flex items-center gap-3 bg-slate-950/85 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
          <span className="font-mono text-amber-400 font-bold">
            {currentFrame?.timestamp.toFixed(1)} 秒
          </span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={frameIndex}
            onChange={(e) => {
              setFrameIndex(Number(e.target.value));
              setIsPlaying(false);
            }}
            className="flex-1 accent-amber-500 cursor-pointer"
          />
          <span className="text-slate-400 font-semibold">
            領先距離：{Math.round(currentFrame?.horses[0]?.currentDistance || 0)} / {totalDist} 米
          </span>
        </div>
      </div>

      {/* 實況評述欄 (沿途走位評述累積，放在跑馬框外) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-2.5">
          <h3 className="text-sm font-bold text-white">🎙️ 實況評述</h3>
          <span className="text-[11px] text-slate-500">沿途走位・最新一句在最上</span>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {feedLines.length === 0 ? (
            <div className="text-xs text-slate-500">賽事即將開始，評述準備中…</div>
          ) : (
            feedLines.map((l, i) => (
              <div
                key={`${l.t}-${i}`}
                className={`flex items-baseline gap-2 text-xs leading-relaxed ${
                  i === 0 ? 'text-amber-200 font-bold' : 'text-slate-300'
                }`}
              >
                <span className="font-mono text-slate-500 shrink-0">{l.t.toFixed(1)}s</span>
                <span className="flex-1">{l.text}</span>
                <span className="text-slate-500 shrink-0">餘 {l.remain} 米</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* HKJC Authentic Live Running Order Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>即時走勢名次榜 (Live Running Order)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-normal">
              {currentFrame?.horses.length || 0} 匹參賽馬
            </span>
          </h3>
          <span className="text-xs text-slate-400">點擊馬匹可切換專屬視角追蹤</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {currentFrame?.horses.map((h) => {
            const isFirst = h.rank === 1;
            const isSelected = selectedHorseId === h.horseId;
            const isPlayer = playerHorseIds.has(h.horseId);
            const speedKmh = ((h.currentSpeed || 16) * 3.6).toFixed(1);

            return (
              <div
                key={h.horseId}
                onClick={() => setSelectedHorseId(isSelected ? null : h.horseId)}
                className={`p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isPlayer
                    ? 'bg-amber-950/40 border-amber-500/60 ring-2 ring-amber-500/30'
                    : isSelected
                    ? 'bg-slate-800/90 border-emerald-400 ring-2 ring-emerald-500/20'
                    : isFirst
                    ? 'bg-slate-950/90 border-yellow-500/40'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-black text-xs ${
                        isFirst
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {h.rank}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/40"
                      style={{ backgroundColor: h.silkColor || '#f59e0b' }}
                    />
                    <span className="text-[11px] font-mono text-slate-400">{h.numberCloth}號</span>
                  </div>

                  <span className="font-mono text-[10px] text-amber-400 font-bold">
                    {speedKmh} km/h
                  </span>
                </div>

                <div className="truncate font-extrabold text-xs text-white mb-1 flex items-center gap-1">
                  {isPlayer && <span className="text-amber-400 text-[10px]">⭐</span>}
                  <span className="truncate">{h.horseNameZh}</span>
                </div>

                {/* Stamina & Status bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>體力</span>
                    <span className="font-mono text-emerald-400">{Math.round(h.currentEnergy)}%</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-150 ${
                        h.currentEnergy > 50
                          ? 'bg-emerald-500'
                          : h.currentEnergy > 20
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, h.currentEnergy))}%` }}
                    />
                  </div>
                </div>

                {/* Traffic alert */}
                {h.isBlocked && (
                  <div className="text-[9px] text-red-400 font-bold mt-1 text-center bg-red-950/40 rounded py-0.5 border border-red-500/20">
                    ⚠️ 內欄受阻
                  </div>
                )}
                {h.isSprinting && !h.isBlocked && (
                  <div className="text-[9px] text-amber-400 font-bold mt-1 text-center bg-amber-950/40 rounded py-0.5 border border-amber-500/20">
                    🔥 爆發衝刺
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Result Modal */}
      {showResultModal && (
        <RaceResultModal
          result={simResult}
          onClose={() => setShowResultModal(false)}
        />
      )}
    </div>
  );
};
