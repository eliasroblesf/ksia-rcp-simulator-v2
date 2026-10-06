/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Ultra-Realistic Clinical AED Defibrillator Unit
 * Modeled after airport terminal emergency AEDs (Physio-Control / Zoll / Philips)
 * Features real-time ECG oscilloscope with sweep-line, audio voice prompts,
 * high-voltage capacitor charging, safety clearance interlock, and illuminated shock button.
 * Guaranteed to fit within mobile screens (100dvh) without scrolling.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  ShieldCheck, 
  Volume2, 
  RotateCcw, 
  AlertTriangle, 
  Heart, 
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Sparkles
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface AEDUnitProps {
  onShockDelivered: () => void;
  onPostShockResume: () => void;
  earlyAedTriggered?: boolean;
  earlyAedPenalty?: number;
}

export type AEDStatus = 
  | 'analyzing'
  | 'shock_advised'
  | 'charging'
  | 'stand_clear'
  | 'ready_to_shock'
  | 'shock_delivered'
  | 'resume_cpr';

export const AEDUnit: React.FC<AEDUnitProps> = ({
  onShockDelivered,
  onPostShockResume,
  earlyAedTriggered = false,
  earlyAedPenalty = 0
}) => {
  const [status, setStatus] = useState<AEDStatus>('analyzing');
  const [chargeProgress, setChargeProgress] = useState<number>(0);
  const [isBystanderClearConfirmed, setIsBystanderClearConfirmed] = useState<boolean>(false);
  const [audioPrompt, setAudioPrompt] = useState<string>('ANALYZING HEART RHYTHM... DO NOT TOUCH PATIENT!');
  const [shockCount, setShockCount] = useState<number>(0);
  const [joulesDelivered, setJoulesDelivered] = useState<number>(0);
  const [voiceReplayActive, setVoiceReplayActive] = useState<boolean>(false);

  // Canvas ref for real-time ECG oscilloscope sweep
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const sweepXRef = useRef<number>(0);
  const ecgPointsRef = useRef<number[]>([]);

  // Function to announce prompt via voice + screen
  const announcePrompt = (text: string, voiceText?: string) => {
    setAudioPrompt(text);
    soundEngine.speakAEDPrompt(voiceText || text);
  };

  // Stage 1: Analyze rhythm on startup
  useEffect(() => {
    soundEngine.playWarning();
    announcePrompt(
      'ANALYZING HEART RHYTHM... DO NOT TOUCH THE PATIENT!',
      'Analyzing heart rhythm. Do not touch the patient.'
    );

    const timer = setTimeout(() => {
      setStatus('shock_advised');
      announcePrompt(
        'SHOCK ADVISED! STAND CLEAR OF PATIENT!',
        'Shock advised. Stand clear of patient.'
      );
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  // Stage 2: Shock advised -> start charging capacitor
  useEffect(() => {
    if (status === 'shock_advised') {
      const chargeTimer = setTimeout(() => {
        setStatus('charging');
        announcePrompt(
          'CHARGING DEFIBRILLATOR (150 JOULES BIPHASIC)... STAND CLEAR!',
          'Charging defibrillator. Stand clear.'
        );
        soundEngine.playAEDCharging(2.6);

        let progress = 0;
        const interval = setInterval(() => {
          progress += 5;
          setChargeProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setStatus('stand_clear');
            announcePrompt(
              'EVERYBODY STAND CLEAR! DO NOT TOUCH THE PATIENT!',
              'Everybody stand clear. Do not touch the patient.'
            );
          }
        }, 130);
      }, 1200);

      return () => clearTimeout(chargeTimer);
    }
  }, [status]);

  // Stage 3: Confirm everybody clear (safety interlock)
  const handleConfirmClear = () => {
    setIsBystanderClearConfirmed(true);
    setStatus('ready_to_shock');
    soundEngine.playWarning();
    announcePrompt(
      'PATIENT IS CLEAR! PRESS FLASHING ORANGE SHOCK BUTTON NOW!',
      'Patient is clear. Press flashing orange shock button now.'
    );
  };

  // Stage 4: Press Physical Shock Button
  const handleTriggerShock = () => {
    if (status !== 'ready_to_shock') return;

    soundEngine.playShockDischarge();
    setStatus('shock_delivered');
    setShockCount(1);
    setJoulesDelivered(150);
    announcePrompt(
      'SHOCK 1 DELIVERED (150J BIPHASIC)!',
      'Shock delivered.'
    );
    onShockDelivered();

    setTimeout(() => {
      setStatus('resume_cpr');
      announcePrompt(
        'PATIENT SAFE TO TOUCH. START CPR CHEST COMPRESSIONS IMMEDIATELY!',
        'Patient is safe to touch. Begin chest compressions immediately.'
      );
    }, 2000);
  };

  const handleReplayVoice = () => {
    setVoiceReplayActive(true);
    setTimeout(() => setVoiceReplayActive(false), 500);
    soundEngine.speakAEDPrompt(audioPrompt);
  };

  // Real-time medical ECG oscilloscope sweep loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    const renderScope = () => {
      // Semi-transparent phosphorescent fade trail
      ctx.fillStyle = 'rgba(3, 13, 23, 0.18)';
      ctx.fillRect(0, 0, width, height);

      // Eraser cursor line
      const cursorX = sweepXRef.current;
      ctx.fillStyle = '#030d17';
      ctx.fillRect(cursorX, 0, 10, height);

      let y = midY;
      const t = Date.now() / 1000;

      if (status === 'shock_delivered') {
        // High-voltage discharge deflection spike then brief baseline
        y = midY + (Math.sin(t * 40) * 2);
      } else if (status === 'resume_cpr') {
        // Slow post-shock rhythm with recovery waves
        const cycle = (t * 1.0) % 1;
        if (cycle < 0.12) y = midY - 6;
        else if (cycle < 0.18) y = midY + 4;
        else if (cycle < 0.22) y = midY - 22; // R-wave
        else if (cycle < 0.26) y = midY + 8;
        else if (cycle < 0.45) y = midY - 8;
        else y = midY + (Math.random() - 0.5) * 1.5;
      } else {
        // Realistic Coarse Ventricular Fibrillation (V-Fib) chaotic waveform
        const wave1 = Math.sin(t * 16) * 13;
        const wave2 = Math.sin(t * 26 + 1.2) * 9;
        const wave3 = Math.sin(t * 7 + 0.4) * 6;
        const noise = (Math.random() - 0.5) * 4;
        y = midY + wave1 + wave2 + wave3 + noise;
      }

      ctx.beginPath();
      ctx.strokeStyle = status === 'ready_to_shock' 
        ? '#f87171' // bright emergency red during shock arming
        : status === 'shock_delivered'
        ? '#fbbf24' // discharge gold
        : status === 'resume_cpr'
        ? '#34d399' // post-shock recovery green
        : '#38bdf8'; // standard telemetry cyan
      ctx.lineWidth = 2.2;
      ctx.shadowBlur = 6;
      ctx.shadowColor = ctx.strokeStyle;

      const prevY = ecgPointsRef.current[ecgPointsRef.current.length - 1] ?? midY;
      ctx.moveTo(cursorX === 0 ? 0 : cursorX - 2, prevY);
      ctx.lineTo(cursorX, y);
      ctx.stroke();

      ctx.shadowBlur = 0; // reset shadow
      ecgPointsRef.current.push(y);
      if (ecgPointsRef.current.length > width) {
        ecgPointsRef.current.shift();
      }

      sweepXRef.current = (sweepXRef.current + 2) % width;
      animFrameRef.current = requestAnimationFrame(renderScope);
    };

    animFrameRef.current = requestAnimationFrame(renderScope);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [status]);

  return (
    <div className="w-full h-full max-h-full bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 border-3 sm:border-4 border-slate-900 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl flex flex-col justify-between text-slate-100 overflow-hidden relative select-none">
      
      {/* Top Outer Bezel / Handle & Airport Fleet Metadata */}
      <div className="bg-slate-950/90 border border-amber-300/40 rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2">
          {/* Official Green Medical AED Symbol */}
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-600 border border-emerald-300 text-white flex items-center justify-center font-black shadow-md shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="text-[11px] sm:text-xs font-black text-amber-300 tracking-wider uppercase leading-tight">
              KSIA AUTOMATED EXTERNAL DEFIBRILLATOR
            </div>
            <div className="text-[9px] text-slate-300 font-mono leading-tight">
              MODEL: LIFE-PRO 9000 · BIPHASIC 150J · SER #KSIA-AED-42
            </div>
          </div>
        </div>

        {/* Real-time Status OK Glass Window */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-2 py-1 rounded-lg shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[9px] sm:text-[10px] font-black text-emerald-400 font-mono tracking-tight">
            STATUS: OK
          </span>
        </div>
      </div>

      {/* Early AED Transition Penalty Banner (if activated) */}
      {earlyAedTriggered && (
        <div className="bg-red-950/90 border border-red-500 text-red-200 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center justify-between shrink-0 animate-pulse my-0.5">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Early AED Deployment Triggered</span>
          </div>
          <span className="font-mono text-red-300 font-black">
            Penalty: -{earlyAedPenalty} Pts
          </span>
        </div>
      )}

      {/* =========================================================================
          REALISTIC CLINICAL MEDICAL LCD MONITOR
          ========================================================================= */}
      <div className="bg-[#030d17] border-2 sm:border-3 border-slate-900 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col justify-between shadow-inner relative overflow-hidden flex-1 min-h-0 my-1">
        
        {/* Background Medical Oscilloscope Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(56, 189, 248, 0.4) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(56, 189, 248, 0.4) 1px, transparent 1px)
            `,
            backgroundSize: '16px 16px'
          }}
        />

        {/* LCD Telemetry Header Bar */}
        <div className="relative z-10 flex items-center justify-between text-[9px] sm:text-[10px] font-mono text-slate-400 border-b border-slate-800 pb-1 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-black">LEAD: PADS</span>
            <span>·</span>
            <span>25 mm/s</span>
            <span>·</span>
            <span>10 mm/mV</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold">IMPEDANCE: 64 Ω (OK)</span>
            <span>·</span>
            <span className="text-amber-400 font-bold">ADULT MODE</span>
          </div>
        </div>

        {/* Real-time Oscilloscope ECG Canvas Sweep */}
        <div className="relative z-10 w-full h-16 sm:h-20 my-1 bg-[#020912]/80 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={480}
            height={90}
            className="w-full h-full block"
          />

          {/* Rhythm Label Overlay */}
          <div className="absolute top-1 left-2 flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono font-bold">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className={status === 'resume_cpr' ? 'text-emerald-400' : 'text-red-400 animate-pulse'}>
              {status === 'resume_cpr' ? 'POST-SHOCK RHYTHM' : 'COARSE VENTRICULAR FIBRILLATION'}
            </span>
          </div>

          {/* Joules / Energy Badge */}
          <div className="absolute top-1 right-2 text-[9px] sm:text-[10px] font-mono font-black text-amber-400">
            {status === 'charging' 
              ? `${Math.round((chargeProgress / 100) * 150)} J` 
              : status === 'shock_delivered' || status === 'resume_cpr'
              ? '150 J BIPHASIC'
              : 'ARMED: 150 J'}
          </div>
        </div>

        {/* Clinical Audio Voice Prompt Banner (Matches real AED LCD display prompts) */}
        <div className="relative z-10 w-full bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 sm:p-2 flex items-center justify-between gap-2 shadow-inner shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1 rounded-lg shrink-0 ${
              status === 'ready_to_shock' ? 'bg-red-500 text-white animate-pulse' : 'bg-cyan-950 text-cyan-400'
            }`}>
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[8px] sm:text-[9px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
                AED AUDIO PROMPT & DISPLAY:
              </div>
              <div className={`text-xs sm:text-sm font-black tracking-wide truncate ${
                status === 'ready_to_shock' 
                  ? 'text-amber-300 font-mono animate-pulse' 
                  : status === 'shock_delivered'
                  ? 'text-emerald-400'
                  : status === 'stand_clear'
                  ? 'text-red-300'
                  : 'text-amber-200'
              }`}>
                {audioPrompt}
              </div>
            </div>
          </div>

          {/* Replay Prompt Button */}
          <button
            onClick={handleReplayVoice}
            title="Hear voice prompt again"
            className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[9px] sm:text-[10px] font-bold text-slate-300 flex items-center gap-1 shrink-0 border border-slate-700 cursor-pointer active:scale-95"
          >
            <RotateCcw className={`w-3 h-3 ${voiceReplayActive ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Repeat</span>
          </button>
        </div>

        {/* Capacitor Charging Gauge (Active when charging) */}
        {status === 'charging' && (
          <div className="relative z-10 w-full mt-1.5 bg-slate-900 border border-amber-500/50 rounded-lg p-1.5 flex flex-col gap-1 shrink-0 animate-pulse">
            <div className="flex items-center justify-between text-[9px] font-mono font-bold text-amber-300">
              <span>CHARGING BIPHASIC CAPACITOR...</span>
              <span>{chargeProgress}% ({Math.round((chargeProgress / 100) * 150)} / 150 J)</span>
            </div>
            <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 transition-all duration-100"
                style={{ width: `${chargeProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          LOWER CONTROLS: PAD CHECK + SAFETY CLEARANCE + SHOCK BUTTON
          ========================================================================= */}
      <div className="bg-slate-950/90 border border-amber-300/40 rounded-xl sm:rounded-2xl p-2 sm:p-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-lg shrink-0">
        
        {/* Left Side: Safety Checklist & Interlock */}
        <div className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col justify-between">
          <div className="text-[10px] sm:text-[11px] font-bold text-slate-200 uppercase flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SAFETY INTERLOCK PROTOCOL</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-400">PADS: LOCKED</span>
          </div>

          <div className="grid grid-cols-2 gap-1 text-[9px] sm:text-[10px] text-slate-300 font-medium mb-1.5">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>1. Hands off chest</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>2. Bystanders back</span>
            </div>
            <div className="flex items-center gap-1 col-span-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span>3. Shout: <strong className="text-white">"EVERYBODY STAND CLEAR!"</strong></span>
            </div>
          </div>

          {/* Action Button: Confirm Stand Clear */}
          {status === 'stand_clear' && (
            <button
              onClick={handleConfirmClear}
              className="w-full py-1.5 sm:py-2 px-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wide transition-transform active:scale-95 shadow-md flex items-center justify-center gap-1.5 cursor-pointer ring-2 ring-amber-300"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>CONFIRM ALL CLEAR (UNLOCK SHOCK BUTTON)</span>
            </button>
          )}

          {isBystanderClearConfirmed && status !== 'resume_cpr' && (
            <div className="text-[10px] sm:text-[11px] text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Interlock Cleared · Capacitor Armed</span>
            </div>
          )}

          {status === 'resume_cpr' && (
            <div className="text-[10px] sm:text-[11px] text-cyan-300 flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Shock Delivered · Commence CPR compressions</span>
            </div>
          )}
        </div>

        {/* Right Side: Heavy-Duty Illuminated Shock Delivery Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex flex-col items-center justify-center">
            <button
              onClick={handleTriggerShock}
              disabled={status !== 'ready_to_shock'}
              title={status === 'ready_to_shock' ? 'Press to deliver 150J Shock' : 'Safety lock engaged'}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 flex flex-col items-center justify-center transition-all relative select-none ${
                status === 'ready_to_shock'
                  ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-600 border-yellow-200 shadow-2xl shadow-orange-500/90 cursor-pointer animate-bounce ring-6 ring-amber-400/50 active:scale-90'
                  : status === 'shock_delivered'
                  ? 'bg-emerald-950 border-emerald-500 opacity-80 cursor-default'
                  : 'bg-slate-900 border-slate-700 opacity-40 cursor-not-allowed'
              }`}
            >
              <Zap className={`w-7 h-7 sm:w-9 sm:h-9 ${
                status === 'ready_to_shock' ? 'text-white fill-white' : 'text-slate-500'
              }`} />
              <span className={`text-[9px] sm:text-[10px] font-black uppercase mt-0.5 tracking-tight ${
                status === 'ready_to_shock' ? 'text-white font-mono' : 'text-slate-500'
              }`}>
                {status === 'ready_to_shock' ? 'SHOCK' : 'LOCKED'}
              </span>
            </button>
            <span className="text-[9px] font-mono text-slate-300 mt-0.5 font-bold">
              DISCHARGE
            </span>
          </div>
        </div>
      </div>

      {/* Stage Transition: Resume CPR immediately after shock */}
      {status === 'resume_cpr' && (
        <div className="mt-1 p-2 rounded-xl bg-emerald-950 border-2 border-emerald-400 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xl animate-pulse shrink-0">
          <div className="text-[10px] sm:text-xs text-emerald-100 font-medium">
            <strong className="block text-xs font-black text-emerald-300">
              ✓ SHOCK 1 COMPLETE! NOW PUMP CHEST IMMEDIATELY:
            </strong>
            Chest compressions circulate oxygenated blood through the revived heart!
          </div>
          <button
            onClick={onPostShockResume}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 shadow-lg active:scale-95 cursor-pointer"
          >
            COMMENCE CPR (WAKE DUMMY) →
          </button>
        </div>
      )}
    </div>
  );
};
