/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Gamified 2-Minute CPR Countdown HUD & Mission Radar
 * Displays visible timer, AED arrival dispatch announcements, combo streak, and score
 */

import React from 'react';
import { Timer, Zap, Flame, ShieldAlert, Radio, ArrowRight, Activity } from 'lucide-react';

interface CPRCountdownHUDProps {
  secondsLeft: number;        // Countdown from 120 to 0
  totalSeconds?: number;      // 120 seconds (2 minutes)
  pressureTrend: 'rising' | 'steady' | 'dropping';
  currentStreak: number;
  score: number;
  isAlive: boolean;
}

export const CPRCountdownHUD: React.FC<CPRCountdownHUDProps> = ({
  secondsLeft,
  totalSeconds = 120,
  pressureTrend,
  currentStreak,
  score,
  isAlive
}) => {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPct = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  // Announcement based on countdown time
  let aedAnnouncement = "AED wall unit dispatched from Gate 40 pillar...";
  let aedBadge = "AED EN ROUTE";
  let aedUrgency = "normal";

  if (secondsLeft <= 15) {
    aedAnnouncement = "🚨 AED IS HERE! Runner approaching Gate 42! Get ready to place pads!";
    aedBadge = "AED ARRIVING NOW!";
    aedUrgency = "critical";
  } else if (secondsLeft <= 60) {
    aedAnnouncement = "⚡ Paramedic running with AED through concourse! Keep pumping!";
    aedBadge = "AED 1 MINUTE AWAY";
    aedUrgency = "elevated";
  } else if (secondsLeft <= 90) {
    aedAnnouncement = "📻 Radio dispatch confirmed: Concourse AED fetched from Gate 40!";
    aedBadge = "AED DISPATCHED";
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Top Game Bar: Big Timer + AED Announcement */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/50 rounded-3xl p-4 md:p-5 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 text-white relative overflow-hidden">
        {/* Subtle glowing animated backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Big 2-Minute Game Countdown Timer */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center shrink-0">
            {/* Circular Progress Ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="#0f172a"
                stroke="#1e293b"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={secondsLeft <= 20 ? '#f59e0b' : '#38bdf8'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="264"
                strokeDashoffset={264 - (264 * progressPct) / 100}
                className="transition-all duration-300"
              />
            </svg>

            {/* Inner Clock Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-white tabular-nums">
                {timeFormatted}
              </span>
              <span className="text-[9px] font-extrabold uppercase text-slate-400 -mt-1">
                REMAINING
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/40 text-[10px] font-black uppercase tracking-wider">
                LEVEL 4 · 2-MINUTE CPR CHALLENGE
              </span>
              {currentStreak >= 5 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black flex items-center gap-1 animate-bounce">
                  <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                  {currentStreak}x STREAK!
                </span>
              )}
            </div>

            <h2 className="text-base md:text-lg font-black text-white mt-1">
              Pump continuously for 2 Full Minutes
            </h2>
            <p className="text-xs text-slate-300">
              Maintain the rhythm and blood pressure until the defibrillator arrives!
            </p>
          </div>
        </div>

        {/* Right: Next Mission Radar Box (AED Dispatch Announcement) */}
        <div className={`w-full md:w-auto md:max-w-md p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
          aedUrgency === 'critical' 
            ? 'bg-amber-950/80 border-amber-400 text-amber-200 animate-pulse'
            : aedUrgency === 'elevated'
            ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200'
            : 'bg-slate-900/90 border-slate-800 text-slate-200'
        }`}>
          <div className={`p-2.5 rounded-xl shrink-0 ${
            aedUrgency === 'critical' ? 'bg-amber-400 text-slate-950' : 'bg-indigo-600 text-white'
          }`}>
            <Zap className="w-5 h-5 fill-current" />
          </div>

          <div className="flex-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wide flex items-center gap-1 text-amber-300">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                NEXT MISSION: {aedBadge}
              </span>
              <span className="font-mono font-bold text-[10px] text-slate-400">
                Arrives at 00:00
              </span>
            </div>
            <div className="font-bold text-white mt-0.5 leading-snug">
              {aedAnnouncement}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Blood Pressure Status Bar: Holding on vs Dropping */}
      <div className={`px-4 py-2.5 rounded-2xl border-2 flex items-center justify-between text-xs font-bold transition-all shadow-md ${
        pressureTrend === 'rising'
          ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
          : pressureTrend === 'steady'
          ? 'bg-blue-950/90 border-blue-500 text-blue-200'
          : 'bg-red-950/90 border-red-500 text-red-200 animate-pulse'
      }`}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 shrink-0" />
          <span>
            {pressureTrend === 'rising' && '🔼 PRESSURE IS RISING! GREAT PUMPING! KEEP UP THIS BEAT!'}
            {pressureTrend === 'steady' && '🟢 PRESSURE IS HOLDING ON STEADY! DUMMY IS ALIVE!'}
            {pressureTrend === 'dropping' && '🔻 WARNING: PRESSURE IS DROPPING! PUMP FASTER BEFORE IT DIES!'}
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono font-black text-xs">
          <span>SCORE: {score} PTS</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
            pressureTrend === 'dropping' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {pressureTrend === 'dropping' ? 'DROPPING 🔻' : pressureTrend === 'rising' ? 'RISING 🔼' : 'HOLDING ON 🟢'}
          </span>
        </div>
      </div>
    </div>
  );
};
