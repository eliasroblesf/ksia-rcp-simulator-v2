/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Unified, Phone-Optimized CPR Screen with Pre-Start Overlay Instructions
 * & Early AED Deployment with 10 pt / 20 sec Penalty Mechanism.
 * Fits completely in mobile viewport (100dvh) without scrolling.
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Hand, 
  Activity, 
  FastForward, 
  Sparkles, 
  Flame, 
  ShieldAlert,
  Zap,
  Radio,
  Play,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ArrowDown,
  XCircle,
  AlertOctagon
} from 'lucide-react';
import { HemodynamicState } from '../types';
import { HemodynamicMonitor } from './HemodynamicMonitor';
import { MannequinViewer } from './MannequinViewer';

interface CPRActiveScreenProps {
  hemodynamics: HemodynamicState;
  cprSecondsLeft: number;
  totalSeconds?: number;
  pressureTrend: 'rising' | 'steady' | 'dropping';
  gameScore: number;
  streakCount: number;
  totalCompressions: number;
  studentName?: string;
  isPumpingActive: boolean;
  onStartPumping: () => void;
  onPausePumping?: () => void;
  onResumePumping?: () => void;
  onCompress: () => void;
  onFastForward: () => void;
  onSwitchToAedEarly?: (penalty: number, secondsShort: number) => void;
  simulationMode?: 'exam' | 'practice';
  metronomeEnabled?: boolean;
  postShockMode?: boolean;
  postShockCount?: number;
  postShockTarget?: number;
}

export const CPRActiveScreen: React.FC<CPRActiveScreenProps> = ({
  hemodynamics,
  cprSecondsLeft,
  totalSeconds = 120,
  pressureTrend,
  gameScore,
  streakCount,
  totalCompressions,
  studentName = 'Player',
  isPumpingActive,
  onStartPumping,
  onPausePumping,
  onResumePumping,
  onCompress,
  onFastForward,
  onSwitchToAedEarly,
  simulationMode = 'practice',
  metronomeEnabled = true,
  postShockMode = false,
  postShockCount = 0,
  postShockTarget = 18
}) => {
  // Local overlay modal state
  const [showOverlay, setShowOverlay] = useState<boolean>(!isPumpingActive && !postShockMode);
  const [showEarlyAedModal, setShowEarlyAedModal] = useState<boolean>(false);
  const [buttonPressed, setButtonPressed] = useState<boolean>(false);
  const [beatPulse, setBeatPulse] = useState<boolean>(false);

  // Time calculations
  const minutes = Math.floor(cprSecondsLeft / 60);
  const seconds = cprSecondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Early AED Penalty calculation: 10 points penalty for every 20 seconds short of 2 minutes
  const secondsShort = Math.max(0, cprSecondsLeft);
  const intervalsShort = Math.ceil(secondsShort / 20);
  const earlyPenalty = intervalsShort * 10;

  // Visual metronome cadence beat (110 BPM = ~545ms)
  // The metronome shall ONLY work when there is a pumping practice!
  const isPumpingPracticeActive = 
    isPumpingActive && 
    !showOverlay && 
    !showEarlyAedModal && 
    simulationMode === 'practice' && 
    metronomeEnabled;

  useEffect(() => {
    if (!isPumpingPracticeActive) {
      setBeatPulse(false);
      return;
    }
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 110);
    }, 545);
    return () => clearInterval(interval);
  }, [isPumpingPracticeActive]);

  const handlePumpClick = () => {
    if (showOverlay || showEarlyAedModal) return;
    setButtonPressed(true);
    setTimeout(() => setButtonPressed(false), 80);
    onCompress();
  };

  // Keyboard shortcut Spacebar/Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showOverlay || showEarlyAedModal) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handlePumpClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showOverlay, showEarlyAedModal, onCompress]);

  const handleStartGame = () => {
    setShowOverlay(false);
    onStartPumping();
  };

  const handleOpenHelp = () => {
    if (onPausePumping) onPausePumping();
    setShowOverlay(true);
  };

  const handleResumeGame = () => {
    setShowOverlay(false);
    if (onResumePumping) onResumePumping();
    else onStartPumping();
  };

  // Early AED handlers
  const handleOpenEarlyAedModal = () => {
    if (onPausePumping) onPausePumping();
    setShowEarlyAedModal(true);
  };

  const handleCancelEarlyAedModal = () => {
    setShowEarlyAedModal(false);
    if (onResumePumping) onResumePumping();
  };

  const handleConfirmEarlyAed = () => {
    setShowEarlyAedModal(false);
    if (onSwitchToAedEarly) {
      onSwitchToAedEarly(earlyPenalty, secondsShort);
    }
  };

  // AED announcement status
  let aedAnnouncement = "AED runner dispatched...";
  let aedBadge = "AED ON WAY";
  if (cprSecondsLeft <= 15) {
    aedAnnouncement = "🚨 AED IS HERE! Runner approaching!";
    aedBadge = "AED ARRIVING!";
  } else if (cprSecondsLeft <= 60) {
    aedAnnouncement = "⚡ Runner approaching concourse!";
    aedBadge = "AED 1 MIN AWAY";
  }

  const bpm = hemodynamics.rhythmBpm;
  const isOptimalSpeed = bpm >= 100 && bpm <= 120;
  const isSlow = bpm > 0 && bpm < 100;
  const isIdle = bpm === 0;

  return (
    <div className="relative w-full h-full flex flex-col justify-between overflow-hidden text-white select-none gap-1 sm:gap-2">
      
      {/* =========================================================================
          EARLY AED TRANSITION CONFIRMATION MODAL (10 PT / 20 SEC PENALTY)
          ========================================================================= */}
      {showEarlyAedModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 text-center animate-fade-in overflow-hidden">
          <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 to-red-950/80 border-2 sm:border-3 border-amber-400 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center justify-between gap-3 max-h-full overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md shrink-0">
              <Zap className="w-4 h-4 fill-slate-950" />
              EARLY AED TRANSITION
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-tight shrink-0">
              Switch from CPR to AED Defibrillator Now?
            </h2>

            {/* Penalty Information Card */}
            <div className="w-full bg-slate-950/90 border-2 border-red-500/80 rounded-xl p-3 flex flex-col gap-2 text-left shrink-0">
              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-bold">CPR Target Duration:</span>
                <span className="font-mono font-black text-white">2:00 Minutes (120s)</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-bold">Current Time Short:</span>
                <span className="font-mono font-black text-amber-400">
                  {secondsShort}s short ({intervalsShort} × 20-second units)
                </span>
              </div>

              <div className="flex items-center justify-between text-xs bg-red-950/80 p-2 rounded-lg border border-red-500/50">
                <div className="flex items-center gap-1.5 text-red-300 font-bold">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Early Switch Penalty:</span>
                </div>
                <span className="font-mono font-black text-sm text-red-300">
                  -{earlyPenalty} Points
                </span>
              </div>

              <div className="text-[10px] text-slate-300 leading-relaxed">
                <strong className="text-amber-300">Rule:</strong> 10 point penalty for every 20 seconds short of 2 minutes. Resuscitation guidelines advise 2 minutes of continuous CPR before defibrillator rhythm analysis.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={handleConfirmEarlyAed}
                className="w-full sm:flex-1 py-2.5 sm:py-3 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Move to AED (-{earlyPenalty} Pts)</span>
              </button>

              <button
                onClick={handleCancelEarlyAedModal}
                className="w-full sm:w-auto py-2.5 sm:py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
              >
                <span>Continue CPR</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRE-START OVERLAY INSTRUCTION: WHERE TO PUMP & HOW TO KEEP DUMMY ALIVE
          (Strictly sized to fit in any phone screen without scrolling)
          ========================================================================= */}
      {showOverlay && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 text-center animate-fade-in overflow-hidden">
          <div className="w-full max-w-sm sm:max-w-md bg-gradient-to-b from-slate-900 to-indigo-950 border-2 sm:border-3 border-amber-400 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl flex flex-col items-center justify-between gap-2 sm:gap-3 max-h-full overflow-hidden">
            
            {/* Header Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-md shrink-0">
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              IMPORTANT: WHERE TO PUMP
            </div>

            <h2 className="text-base sm:text-lg font-black text-white leading-tight shrink-0">
              Where to Pump & How to Save the Dummy
            </h2>

            {/* VISUAL DIAGRAM BOX: 2 WHERE-TO-PUMP LOCATIONS */}
            <div className="w-full grid grid-cols-2 gap-2 shrink-0">
              {/* Location 1: Center of Chest */}
              <div className="bg-slate-950/90 border-2 border-amber-400/80 rounded-xl p-2 flex flex-col items-center text-center">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-amber-400 bg-amber-400/20 animate-ping" />
                  <div className="w-10 h-10 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center shadow-lg">
                    <Hand className="w-5 h-5 text-slate-950 fill-slate-950" />
                  </div>
                </div>
                <span className="text-[11px] font-black text-amber-300 mt-1 uppercase leading-tight">
                  1. Dummy's Chest
                </span>
                <span className="text-[9px] text-slate-300 leading-tight mt-0.5">
                  Tap the <strong className="text-white">FLASHING TARGET</strong> on breastbone
                </span>
              </div>

              {/* Location 2: Big Button */}
              <div className="bg-slate-950/90 border-2 border-orange-500/80 rounded-xl p-2 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 border-2 border-white flex items-center justify-center shadow-lg animate-pulse">
                  <Hand className="w-6 h-6 text-slate-950 fill-slate-950" />
                </div>
                <span className="text-[11px] font-black text-orange-300 mt-1 uppercase leading-tight">
                  2. Bottom Button
                </span>
                <span className="text-[9px] text-slate-300 leading-tight mt-0.5">
                  OR tap the <strong className="text-white">BIG ORANGE BUTTON</strong> below
                </span>
              </div>
            </div>

            {/* 3 QUICK RULES */}
            <div className="w-full bg-slate-950/80 rounded-xl border border-slate-800 p-2 sm:p-2.5 flex flex-col gap-1.5 text-left text-[10px] sm:text-[11px] shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-[9px] shrink-0">✓</span>
                <span className="text-slate-200">
                  <strong className="text-emerald-300">KEEP IN GREEN:</strong> Pump at 100-120 speed to keep pressure up.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white font-black flex items-center justify-center text-[9px] shrink-0">!</span>
                <span className="text-slate-200">
                  <strong className="text-red-300">DON'T STOP:</strong> If needle falls to RED, dummy dies in 4 seconds!
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-blue-500 text-white font-black flex items-center justify-center text-[9px] shrink-0">⏱</span>
                <span className="text-slate-200">
                  <strong className="text-cyan-300">2 MINUTES:</strong> Standard cycle before AED defibrillator, or move early with penalty.
                </span>
              </div>
            </div>

            {/* BIG START / RESUME BUTTON */}
            <button
              onClick={isPumpingActive ? handleResumeGame : handleStartGame}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-orange-500/40 transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer ring-4 ring-amber-400/30 shrink-0"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-slate-950 text-slate-950" />
              <span>{isPumpingActive ? 'RESUME PUMPING NOW →' : 'START PUMPING NOW — SAVE DUMMY! →'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TOP COMPACT HUD: TIMER + NEXT AED RADAR + EARLY AED ACTION (FITS IN ~44px)
          ========================================================================= */}
      <div className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-2.5 py-1 sm:py-1.5 flex items-center justify-between gap-1.5 shrink-0">
        
        {/* Timer / Counter */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-950 border border-cyan-400 flex items-center justify-center font-black font-mono text-xs text-white tabular-nums">
            {postShockMode ? `${postShockCount}/${postShockTarget}` : timeFormatted}
          </div>
          <div className="text-[9px] sm:text-[10px] leading-tight">
            <span className="font-extrabold text-white block">
              {postShockMode ? 'WAKE-UP CPR' : '2-MIN CPR'}
            </span>
            <span className="text-slate-400 font-mono">
              Pumps: <strong className="text-emerald-400">{totalCompressions}</strong>
            </span>
          </div>
        </div>

        {/* Early Switch to AED Button (Available at ANY moment during CPR) */}
        {!postShockMode && (
          <button
            onClick={handleOpenEarlyAedModal}
            title={`Move from RCP to AED now with a 10 pt penalty for every 20s short (-${earlyPenalty} pts)`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase shadow-md transition-transform active:scale-95 cursor-pointer shrink-0 border border-amber-300"
          >
            <Zap className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
            <span className="truncate">Move to AED (-{earlyPenalty} pts)</span>
          </button>
        )}

        {/* AED Next Radar (post-shock count) */}
        {postShockMode && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-[9px] sm:text-[10px]">
            <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="font-black text-emerald-300 uppercase truncate">
              {postShockCount} of 18 PUMPS
            </span>
          </div>
        )}

        {/* Action Helpers */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleOpenHelp}
            className="p-1 px-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[9px] font-bold text-amber-300 flex items-center gap-1 cursor-pointer"
            title="Where to pump instructions"
          >
            <HelpCircle className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Help</span>
          </button>

          {!postShockMode && (
            <button
              onClick={onFastForward}
              className="p-1 px-1.5 rounded-lg bg-slate-950 border border-slate-700 text-[9px] font-bold text-amber-400 flex items-center gap-0.5 cursor-pointer"
              title="Fast forward 30 seconds"
            >
              <FastForward className="w-3 h-3" />
              <span>+30s</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MIDDLE STAGE: GAUGE & MANNEQUIN SIDE-BY-SIDE (COMPACT, NO SCROLL)
          ========================================================================= */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-1.5 sm:gap-2 items-center overflow-hidden">
        {/* Left: Blood Pressure Gauge */}
        <div className="col-span-6 h-full flex flex-col justify-center min-h-0">
          <HemodynamicMonitor
            hemodynamics={hemodynamics}
            targetBpmMin={100}
            targetBpmMax={120}
            pressureTrend={pressureTrend}
          />
        </div>

        {/* Right: Mannequin Torso with Glowing Blipping Chest */}
        <div className="col-span-6 h-full flex flex-col items-center justify-center relative min-h-0 overflow-hidden">
          <div className="absolute top-1 z-30 animate-bounce">
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-lg border border-white animate-pulse">
              ⬇️ PUMP HERE! ⬇️
            </span>
          </div>
          <div className="w-full h-full max-h-[35vh] sm:max-h-[38vh] flex items-center justify-center">
            <MannequinViewer
              mode="compressions"
              onCompress={handlePumpClick}
              bpm={hemodynamics.rhythmBpm}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM STAGE: UNMISSABLE GIANT PUMP BUTTON (FITS COMFORTABLY IN PHONE)
          ========================================================================= */}
      <div className="w-full bg-slate-900 border-2 border-amber-400 rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col items-center gap-1 shrink-0 shadow-xl">
        
        {/* Metronome Beat Line - Metronome shall only work when there is a pumping practice */}
        <div className="w-full flex items-center justify-between text-[10px] sm:text-[11px] font-bold px-1 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full transition-all ${
              beatPulse ? 'bg-amber-400 scale-125 shadow-md shadow-amber-400' : 'bg-slate-700'
            }`} />
            <span className="truncate">
              {simulationMode === 'practice' && metronomeEnabled 
                ? 'Rhythm Metronome (110 BPM)' 
                : 'Metronome: Off (Exam Mode)'}
            </span>
          </div>
          <div className="font-mono text-[11px] shrink-0">
            Speed: <strong className={isOptimalSpeed ? 'text-emerald-400' : 'text-amber-400'}>{bpm} BPM</strong>
          </div>
        </div>

        {/* Big Tactile Button */}
        <button
          type="button"
          onClick={handlePumpClick}
          className={`w-full py-2.5 sm:py-3.5 px-3 rounded-lg sm:rounded-xl border-2 sm:border-3 text-center transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-xl cursor-pointer select-none active:scale-95 ${
            buttonPressed
              ? 'bg-amber-400 border-yellow-200 scale-95 shadow-amber-500/60'
              : 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 hover:from-amber-300 hover:to-orange-400 border-white shadow-orange-500/40 animate-pulse'
          }`}
        >
          <Hand className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950 shrink-0" />
          <span className="text-slate-950 font-black text-xs sm:text-base uppercase tracking-wide truncate">
            TAP HERE TO PUMP CHEST!
          </span>
          <Hand className="w-5 h-5 sm:w-6 sm:h-6 fill-slate-950 text-slate-950 shrink-0" />
        </button>

        {/* Live Status Hint */}
        <div className="text-[9px] sm:text-[10px] font-black text-center truncate w-full">
          {isIdle ? (
            <span className="text-amber-400 animate-bounce">
              👆 TAP CONTINUOUSLY TO KEEP DUMMY ALIVE!
            </span>
          ) : isOptimalSpeed ? (
            <span className="text-emerald-400">
              ✓ PERFECT SPEED! KEEP PUMPING AT THIS BEAT!
            </span>
          ) : isSlow ? (
            <span className="text-amber-300">
              ▲ PUMP A LITTLE FASTER! (Keep needle in green!)
            </span>
          ) : (
            <span className="text-red-400">
              ▼ SLOW DOWN SLIGHTLY!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
