/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Compact, Phone-Optimized Dummy Life Meter & Blood Pressure Gauge
 * Fits without scrolling and clearly communicates "HOLDING ON" vs "DROPPING"
 */

import React, { useEffect, useRef } from 'react';
import { Activity, Heart, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';
import { HemodynamicState } from '../types';

interface HemodynamicMonitorProps {
  hemodynamics: HemodynamicState;
  targetBpmMin?: number;
  targetBpmMax?: number;
  showMetronomeGuide?: boolean;
  pressureTrend?: 'rising' | 'steady' | 'dropping';
}

export const HemodynamicMonitor: React.FC<HemodynamicMonitorProps> = ({
  hemodynamics,
  targetBpmMin = 100,
  targetBpmMax = 120,
  pressureTrend = 'steady'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const ecgXRef = useRef<number>(0);
  const lastPointsRef = useRef<number[]>([]);

  // Simple live ECG pulse line
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;

    const renderECG = () => {
      ctx.fillStyle = 'rgba(10, 15, 26, 0.12)';
      ctx.fillRect(0, 0, width, height);

      const cursorX = ecgXRef.current;
      ctx.fillStyle = '#0a0f1a';
      ctx.fillRect(cursorX, 0, 10, height);

      let y = midY;
      const t = Date.now() / 1000;

      if (!hemodynamics.isAlive) {
        y = midY + (Math.random() - 0.5) * 1.5;
      } else if (hemodynamics.ecgState === 'sinus') {
        const cycle = (t * 1.25) % 1;
        if (cycle < 0.1) y = midY - 5;
        else if (cycle < 0.15) y = midY;
        else if (cycle < 0.18) y = midY + 6;
        else if (cycle < 0.22) y = midY - 18;
        else if (cycle < 0.26) y = midY + 8;
        else if (cycle < 0.45) y = midY - 6;
        else y = midY + (Math.random() - 0.5) * 1.5;
      } else if (hemodynamics.rhythmBpm > 40) {
        const compCycle = (t * (hemodynamics.rhythmBpm / 60)) % 1;
        const amplitude = Math.min(20, (hemodynamics.systolicBp / 120) * 20);
        if (compCycle < 0.35) {
          y = midY - Math.sin((compCycle / 0.35) * Math.PI) * amplitude;
        } else {
          y = midY + (Math.random() - 0.5) * 2;
        }
      } else {
        const wave1 = Math.sin(t * 18) * 8;
        const wave2 = Math.sin(t * 27) * 5;
        y = midY + wave1 + wave2;
      }

      ctx.beginPath();
      ctx.strokeStyle = !hemodynamics.isAlive 
        ? '#ef4444' 
        : hemodynamics.ecgState === 'sinus' 
        ? '#10b981' 
        : hemodynamics.systolicBp > 65 
        ? '#38bdf8' 
        : '#f59e0b';
      ctx.lineWidth = 2;

      const prevY = lastPointsRef.current[lastPointsRef.current.length - 1] ?? midY;
      ctx.moveTo(cursorX === 0 ? 0 : cursorX - 2, prevY);
      ctx.lineTo(cursorX, y);
      ctx.stroke();

      lastPointsRef.current.push(y);
      if (lastPointsRef.current.length > width) {
        lastPointsRef.current.shift();
      }

      ecgXRef.current = (ecgXRef.current + 2) % width;
      animFrameRef.current = requestAnimationFrame(renderECG);
    };

    animFrameRef.current = requestAnimationFrame(renderECG);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [hemodynamics]);

  // Analog gauge needle angle
  const pressureValue = Math.min(140, Math.max(0, hemodynamics.systolicBp));
  const needleAngle = -120 + (pressureValue / 140) * 240;

  const secondsLeft = Math.max(0, 4.0 - hemodynamics.criticalSecondsElapsed);
  const isDanger = hemodynamics.systolicBp < 45 && hemodynamics.isAlive;

  return (
    <div className={`w-full h-full max-h-[38vh] bg-slate-950 rounded-2xl p-2.5 sm:p-3 border-2 flex flex-col justify-between text-white transition-all overflow-hidden ${
      pressureTrend === 'dropping'
        ? 'border-red-500 bg-red-950/20'
        : pressureTrend === 'rising'
        ? 'border-emerald-500/80 bg-emerald-950/20'
        : 'border-slate-800'
    }`}>
      {/* Top Header Status */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-1.5 font-bold text-[11px] truncate">
          <Heart className={`w-3.5 h-3.5 shrink-0 ${hemodynamics.isAlive ? 'text-red-500 fill-red-500 animate-pulse' : 'text-slate-500'}`} />
          <span>BLOOD PRESSURE</span>
        </div>

        {/* Dynamic Trend Badge */}
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0 ${
          pressureTrend === 'rising'
            ? 'bg-emerald-500 text-slate-950'
            : pressureTrend === 'steady'
            ? 'bg-blue-600 text-white'
            : 'bg-red-600 text-white animate-bounce'
        }`}>
          {pressureTrend === 'rising' && <TrendingUp className="w-3 h-3 stroke-[3]" />}
          {pressureTrend === 'steady' && <Minus className="w-3 h-3 stroke-[3]" />}
          {pressureTrend === 'dropping' && <TrendingDown className="w-3 h-3 stroke-[3]" />}
          <span>{pressureTrend === 'rising' ? 'RISING 🔼' : pressureTrend === 'steady' ? 'HOLDING 🟢' : 'DROPPING 🔻'}</span>
        </div>
      </div>

      {/* Dial Gauge */}
      <div className="flex items-center justify-center relative flex-1 min-h-0 py-0.5">
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="82" fill="#0f172a" stroke="#1e293b" strokeWidth="6" />

            {/* Red Danger Zone (0 - 45) */}
            <path d="M 33 139 A 80 80 0 0 1 45 61" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
            {/* Yellow Low Zone (45 - 65) */}
            <path d="M 45 61 A 80 80 0 0 1 76 27" fill="none" stroke="#f59e0b" strokeWidth="12" />
            {/* Green Safe Zone (65 - 110) */}
            <path d="M 76 27 A 80 80 0 0 1 155 45" fill="none" stroke="#10b981" strokeWidth="14" />
            {/* High Pressure (110 - 140) */}
            <path d="M 155 45 A 80 80 0 0 1 167 139" fill="none" stroke="#38bdf8" strokeWidth="12" strokeLinecap="round" />

            <text x="36" y="55" fill="#ef4444" fontSize="8" fontWeight="bold">RED</text>
            <text x="100" y="20" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="middle">GREEN</text>

            {/* Center Number */}
            <circle cx="100" cy="100" r="32" fill="#020617" stroke="#334155" strokeWidth="2.5" />
            <text x="100" y="96" fill="#f8fafc" fontSize="20" fontWeight="900" textAnchor="middle" fontFamily="monospace">
              {Math.round(hemodynamics.systolicBp)}
            </text>
            <text x="100" y="111" fill={pressureTrend === 'dropping' ? '#ef4444' : pressureTrend === 'rising' ? '#10b981' : '#94a3b8'} fontSize="7" fontWeight="bold" textAnchor="middle">
              {pressureTrend === 'dropping' ? 'DROPPING' : pressureTrend === 'rising' ? 'RISING' : 'HOLDING'}
            </text>

            {/* Needle */}
            <g transform={`rotate(${needleAngle}, 100, 100)`}>
              <line x1="100" y1="100" x2="100" y2="28" stroke="#f43f5e" strokeWidth="4" strokeLinecap="round" />
              <circle cx="100" cy="100" r="5" fill="#f43f5e" />
            </g>
          </svg>
        </div>
      </div>

      {/* Mini Heart Line & Danger Alert */}
      <div className="shrink-0">
        {isDanger ? (
          <div className="p-1 px-2 rounded-lg bg-red-900/90 border border-red-400 text-red-100 flex items-center justify-between text-[10px] font-black animate-bounce">
            <span className="truncate">⚠️ DROPPING! PUMP FASTER!</span>
            <span className="font-mono text-xs tabular-nums">{secondsLeft.toFixed(1)}s</span>
          </div>
        ) : (
          <div className="w-full h-8 bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden relative">
            <canvas ref={canvasRef} width={220} height={32} className="w-full h-full block" />
            <span className="absolute top-0.5 left-1.5 text-[8px] font-mono text-slate-500 font-bold">
              ECG · {hemodynamics.ecgState === 'sinus' ? 'SINUS' : 'CPR WAVE'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
