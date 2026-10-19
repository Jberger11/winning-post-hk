// ==========================================
// 賽馬 2.5D 電視直播觀賽器 (Live Race Broadcast Viewer)
// 靈感源自 Winning Post 10 2026 頂級視效與香港賽馬會官方實況轉播
// 支援 4 款動態鏡頭、骨骼關節奔馳動畫、草地泥屑粒子、原生 Web Audio 音效
// ==========================================

import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../engine/gameStore';
import { RaceSimulationResult, HorseSimulationState } from '../../types/race';
import { RaceResultModal } from './RaceResultModal';
import {
  CameraMode,
  ParticleSystem,
  drawSideGallopingHorse,
  drawHeadOnFinishCam,
  drawTacticalDroneCam,
} from '../../engine/raceCanvasRenderer';
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
  Sparkles,
} from 'lucide-react';

export const LiveRaceViewer: React.FC = () => {
  const { state, setView, issueTacticalCommand } = useGame();
  const simResult: RaceSimulationResult | null = state.currentSimulationResult;

  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.5);
  const [cameraMode, setCameraMode] = useState<CameraMode>('broadcast');
  const [isMuted, setIsMuted] = useState<boolean>(raceSoundEngine.getMuted());
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null);
  const [lastCommandNotice, setLastCommandNotice] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particleSysRef = useRef<ParticleSystem>(new ParticleSystem());
  const cameraXRef = useRef<number>(0);
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

    // 視角 3 & 4：動態電視直播 (Broadcast) & 愛駒特寫 (My Horse Focus)
    // 計算相機焦點 X 座標
    let focusDist = 0;
    if (cameraMode === 'player') {
      const myHorse = currentFrame.horses.find((h) => playerHorseIds.has(h.horseId));
      focusDist = myHorse ? myHorse.currentDistance : currentFrame.horses[0].currentDistance;
    } else if (selectedHorseId) {
      const selected = currentFrame.horses.find((h) => h.horseId === selectedHorseId);
      focusDist = selected ? selected.currentDistance : currentFrame.horses[0].currentDistance;
    } else {
      // 預設鎖定領放馬與第一群
      focusDist = currentFrame.horses[0]?.currentDistance || 0;
    }

    // 平滑插值相機位置
    const targetCameraX = Math.max(0, focusDist - 45);
    cameraXRef.current += (targetCameraX - cameraXRef.current) * 0.15;
    const camX = cameraXRef.current;

    // 1. 繪製背景與看台天空
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 90);
    skyGrad.addColorStop(0, '#090d16');
    skyGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, 90);

    // 遠處沙田/跑馬地看台建築與燈光
    ctx.fillStyle = '#334155';
    for (let b = 0; b < width; b += 80) {
      const bHeight = 25 + Math.sin(b * 0.05) * 12;
      ctx.fillRect(b, 90 - bHeight, 72, bHeight);
      // 看台燈光
      ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
      ctx.fillRect(b + 8, 90 - bHeight + 6, 56, 4);
      ctx.fillStyle = '#334155';
    }

    // 外欄白圍欄 (Outer Rail)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.lineTo(width, 90);
    ctx.stroke();

    // 圍欄立柱
    for (let px = (-(camX * 8) % 40); px < width; px += 40) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 80);
      ctx.lineTo(px, 92);
      ctx.stroke();
    }

    // 2. 繪製綠草地/全天候跑道與動態草皮橫紋 (Turf Stripes)
    const trackY = 92;
    const trackHeight = height - 120;
    const turfGrad = ctx.createLinearGradient(0, trackY, 0, height);
    if (isDirt) {
      turfGrad.addColorStop(0, '#5a3818');
      turfGrad.addColorStop(1, '#3b240f');
    } else {
      turfGrad.addColorStop(0, '#0d4a25');
      turfGrad.addColorStop(1, '#052e16');
    }
    ctx.fillStyle = turfGrad;
    ctx.fillRect(0, trackY, width, height - trackY);

    // 剪草深淺條紋 (隨著相機疾速向後滾動)
    const stripeWidth = 55;
    const offsetStripe = (-(camX * 7.5)) % (stripeWidth * 2);
    ctx.fillStyle = isDirt ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.05)';
    for (let sx = offsetStripe - stripeWidth * 2; sx < width + stripeWidth * 2; sx += stripeWidth * 2) {
      ctx.fillRect(sx, trackY, stripeWidth, trackHeight);
    }

    // 跑道虛線疊道 (Lanes 1 to 5)
    const laneHeight = trackHeight / 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([12, 12]);
    for (let l = 1; l < 5; l++) {
      ctx.beginPath();
      ctx.moveTo(0, trackY + l * laneHeight);
      ctx.lineTo(width, trackY + l * laneHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 內欄白線 (Inner Rail)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, trackY + trackHeight);
    ctx.lineTo(width, trackY + trackHeight);
    ctx.stroke();

    // 3. 繪製動態途程標柱 (400M 直路, 200M, 100M, 終點柱)
    const meterToPixel = 7.5; // 每米對應像素
    const drawMarker = (markerDist: number, label: string, color: string, isFinish = false) => {
      const screenX = (markerDist - camX) * meterToPixel + 120;
      if (screenX >= -100 && screenX <= width + 100) {
        // 標柱
        ctx.strokeStyle = color;
        ctx.lineWidth = isFinish ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(screenX, trackY - 20);
        ctx.lineTo(screenX, trackY + trackHeight + 15);
        ctx.stroke();

        // 標誌牌
        ctx.fillStyle = color;
        ctx.font = isFinish ? 'black 12px sans-serif' : 'bold 11px sans-serif';
        ctx.fillText(label, screenX - (isFinish ? 40 : 20), trackY - 26);

        if (isFinish) {
          // 終點黑白格旗幟彩帶
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX - 10, trackY - 45, 20, 16);
          ctx.fillStyle = '#dc2626';
          ctx.fillRect(screenX - 10, trackY - 45, 10, 8);
          ctx.fillRect(screenX, trackY - 37, 10, 8);
        }
      }
    };

    drawMarker(totalDist - 400, '400M 入直路', '#38bdf8');
    drawMarker(totalDist - 200, '200M', '#facc15');
    drawMarker(totalDist - 100, '100M', '#fb923c');
    drawMarker(totalDist, '🏁 終點柱 (FINISH)', '#ef4444', true);

    // 4. 更新並渲染泥屑與草皮粒子
    particleSysRef.current.updateAndDraw(ctx);

    // 5. 繪製馬匹 (依外疊到內疊順序排列繪製，內疊覆蓋外疊呈現層次感)
    const sortedHorses = [...currentFrame.horses].sort((a, b) => a.lane - b.lane);

    for (const h of sortedHorses) {
      // 根據當前相機換算屏幕 X
      const screenX = (h.currentDistance - camX) * meterToPixel + 120;
      const screenY = trackY + (h.lane + 0.6) * laneHeight;

      // 步幅相位 (依已跑距離計算奔跑骨骼動畫)
      const stridePhase = (h.currentDistance * 4.2 + h.gate * 0.8) % (Math.PI * 2);

      const isLeader = h.rank === 1;
      const isSelected = selectedHorseId === h.horseId;
      const isPlayer = playerHorseIds.has(h.horseId);
      const scale = 1.15;

      drawSideGallopingHorse(
        ctx,
        h,
        screenX,
        screenY,
        scale,
        isPlayer,
        isLeader,
        isSelected,
        stridePhase,
        particleSysRef.current,
        isDirt
      );
    }
  }, [currentFrame, cameraMode, selectedHorseId, simResult, totalDist]);

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
              { id: 'broadcast', label: '電視追焦', icon: Video },
              { id: 'player', label: '聚焦愛駒', icon: Crosshair },
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
                  setLastCommandNotice(`已下達「${cmd.label}」— 戰術檢討與步速已即時更新！`);
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
        <canvas
          ref={canvasRef}
          width={960}
          height={400}
          className="w-full h-auto block max-h-[480px]"
        />

        {/* HKJC Official Style TV Commentary Bar */}
        <div className="absolute top-3 left-3 right-3 pointer-events-none">
          <div className="bg-slate-950/90 backdrop-blur border border-amber-500/40 rounded-xl px-4 py-2 flex items-center justify-between gap-3 text-xs shadow-xl">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-amber-300 font-black tracking-wide truncate">
                {currentFrame?.commentary || '各駒入閘完畢，旗號揚起！開閘一刻萬馬奔騰！'}
              </span>
            </div>
            <div className="font-mono text-slate-300 font-bold text-xs shrink-0">
              ⏱️ {currentFrame?.timestamp.toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Sectional Split Times HUD (分段時間) */}
        <div className="absolute top-14 left-3 pointer-events-none hidden sm:flex items-center gap-1.5 text-[10px] font-mono font-bold">
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

      {/* HKJC Authentic Live Running Order Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>即時走勢名次榜 (Live Running Order)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-normal">
              12 匹參賽馬
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
