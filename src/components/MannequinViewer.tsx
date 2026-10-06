/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Interactive CPR Mannequin Dummy - Plain English & Game-like visual targets
 * Optimized to fit mobile phone screens (100dvh) without scrolling.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Target, Zap, CheckCircle2, Hand } from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface MannequinViewerProps {
  mode: 'hand_placement' | 'compressions' | 'pad_placement' | 'shock_delivery' | 'view_only';
  onHandPlacementConfirm?: (accuracy: number) => void;
  onCompress?: () => void;
  isCompressing?: boolean;
  compressionDepthMm?: number;
  bpm?: number;
  onPadsPlaced?: (pad1Accuracy: number, pad2Accuracy: number) => void;
  shockActive?: boolean;
}

export const MannequinViewer: React.FC<MannequinViewerProps> = ({
  mode,
  onHandPlacementConfirm,
  onCompress,
  onPadsPlaced,
  shockActive = false
}) => {
  const [targetPos, setTargetPos] = useState<{ x: number; y: number } | null>({ x: 50, y: 46 });
  const [handAccuracy, setHandAccuracy] = useState<number>(95);
  const [placementFeedback, setPlacementFeedback] = useState<string>('✓ OPTIMAL SPOT: Center of chest between nipples.');
  const [isHandValid, setIsHandValid] = useState<boolean>(true);

  // AED Pad placements (0-100%)
  const [pad1Pos, setPad1Pos] = useState<{ x: number; y: number } | null>(null);
  const [pad2Pos, setPad2Pos] = useState<{ x: number; y: number } | null>(null);
  const [selectedPad, setSelectedPad] = useState<'pad1' | 'pad2' | null>('pad1');

  // Animation states
  const [chestSquash, setChestSquash] = useState<boolean>(false);
  const [pulseRipples, setPulseRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const CORRECT_STERNUM = { x: 50, y: 46 };
  const CORRECT_PAD1 = { x: 32, y: 34 };
  const CORRECT_PAD2 = { x: 68, y: 56 };

  // Calculate friendly hand placement feedback
  const evaluateHandPosition = useCallback((x: number, y: number) => {
    const dx = x - CORRECT_STERNUM.x;
    const dy = y - CORRECT_STERNUM.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const acc = Math.max(0, Math.round(100 - dist * 4.5));
    setHandAccuracy(acc);

    if (dist <= 6) {
      setIsHandValid(true);
      setPlacementFeedback('✓ PERFECT SPOT! Right on lower center of breastbone.');
    } else if (y < 35) {
      setIsHandValid(false);
      setPlacementFeedback('TOO HIGH: Near neck/throat! Move hands down.');
    } else if (y > 56) {
      setIsHandValid(false);
      setPlacementFeedback('TOO LOW: On stomach/belly! Move hands up.');
    } else if (x < 42) {
      setIsHandValid(false);
      setPlacementFeedback('TOO FAR RIGHT: Move toward center line.');
    } else if (x > 58) {
      setIsHandValid(false);
      setPlacementFeedback('TOO FAR LEFT: Move toward center line.');
    } else {
      setIsHandValid(dist <= 10);
      setPlacementFeedback('Good area, aim closer to the green center box.');
    }
  }, []);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((e.clientY - rect.top) / rect.height) * 100));

    if (mode === 'hand_placement') {
      setTargetPos({ x, y });
      evaluateHandPosition(x, y);
      soundEngine.playHeartBeep(700);
    } else if (mode === 'pad_placement') {
      if (selectedPad === 'pad1') {
        const d1 = Math.sqrt(Math.pow(x - CORRECT_PAD1.x, 2) + Math.pow(y - CORRECT_PAD1.y, 2));
        const snappedX = d1 < 8 ? CORRECT_PAD1.x : x;
        const snappedY = d1 < 8 ? CORRECT_PAD1.y : y;
        setPad1Pos({ x: snappedX, y: snappedY });
        soundEngine.playPadAttached();
        if (!pad2Pos) setSelectedPad('pad2');
        else setSelectedPad(null);
      } else if (selectedPad === 'pad2') {
        const d2 = Math.sqrt(Math.pow(x - CORRECT_PAD2.x, 2) + Math.pow(y - CORRECT_PAD2.y, 2));
        const snappedX = d2 < 8 ? CORRECT_PAD2.x : x;
        const snappedY = d2 < 8 ? CORRECT_PAD2.y : y;
        setPad2Pos({ x: snappedX, y: snappedY });
        soundEngine.playPadAttached();
        if (!pad1Pos) setSelectedPad('pad1');
        else setSelectedPad(null);
      }
    } else if (mode === 'compressions') {
      triggerCompressionAction();
    }
  };

  const triggerCompressionAction = () => {
    if (!onCompress) return;
    setChestSquash(true);
    soundEngine.playCompression();
    
    setPulseRipples(prev => [
      ...prev.slice(-2),
      { id: Date.now(), x: 50, y: 46 }
    ]);

    setTimeout(() => {
      setChestSquash(false);
    }, 90);

    onCompress();
  };

  // Keyboard shortcut: Spacebar or Enter for CPR compression
  useEffect(() => {
    if (mode !== 'compressions') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        triggerCompressionAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, onCompress]);

  // Check AED pads accuracy
  useEffect(() => {
    if (pad1Pos && pad2Pos && onPadsPlaced) {
      const d1 = Math.sqrt(Math.pow(pad1Pos.x - CORRECT_PAD1.x, 2) + Math.pow(pad1Pos.y - CORRECT_PAD1.y, 2));
      const d2 = Math.sqrt(Math.pow(pad2Pos.x - CORRECT_PAD2.x, 2) + Math.pow(pad2Pos.y - CORRECT_PAD2.y, 2));
      const acc1 = Math.max(0, Math.round(100 - d1 * 5));
      const acc2 = Math.max(0, Math.round(100 - d2 * 5));

      if (d1 <= 12 && d2 <= 12) {
        onPadsPlaced(acc1, acc2);
      }
    }
  }, [pad1Pos, pad2Pos, onPadsPlaced]);

  return (
    <div className="flex flex-col items-center w-full h-full min-h-0 select-none overflow-hidden justify-between">
      {/* Hand Placement Guidance (Compact) */}
      {mode === 'hand_placement' && (
        <div className="w-full mb-1.5 p-2 sm:p-2.5 rounded-xl border border-blue-400/40 bg-blue-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-600 text-white shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs leading-tight">
                {placementFeedback}
              </div>
              <div className="text-[10px] text-blue-300 font-medium">
                Aim Score: <strong className="text-emerald-400">{handAccuracy}%</strong> {isHandValid ? '✓ TARGET READY' : '— Tap chest center'}
              </div>
            </div>
          </div>

          {onHandPlacementConfirm && (
            <button
              type="button"
              onClick={() => onHandPlacementConfirm(handAccuracy)}
              disabled={!isHandValid}
              className={`py-2 px-3 sm:px-4 rounded-lg font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-md transition-transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                isHandValid 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400 animate-pulse' 
                  : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              LOCK HANDS & PUMP CHEST →
            </button>
          )}
        </div>
      )}

      {/* AED Pad Placement Guidance (Compact) */}
      {mode === 'pad_placement' && (
        <div className="w-full mb-1.5 p-2 sm:p-2.5 rounded-xl border border-amber-400/60 bg-amber-950/80 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-amber-500 text-slate-950 font-black shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-amber-200 block text-xs">Stick the 2 Sticky Pads on the Dummy:</span>
              <p className="text-[10px] text-amber-300 font-medium">
                {!pad1Pos ? 'Click Upper Right Chest (Pad 1) to stick it.' :
                 !pad2Pos ? 'Click Lower Left Ribs (Pad 2) to stick it.' :
                 'Both pads stuck on! Starting defibrillator...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedPad('pad1')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                selectedPad === 'pad1' 
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm' 
                  : pad1Pos 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500' 
                  : 'bg-slate-900 text-slate-200 border-slate-700'
              }`}
            >
              Pad 1 (Upper Right) {pad1Pos && '✓'}
            </button>
            <button
              onClick={() => setSelectedPad('pad2')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                selectedPad === 'pad2' 
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-sm' 
                  : pad2Pos 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500' 
                  : 'bg-slate-900 text-slate-200 border-slate-700'
              }`}
            >
              Pad 2 (Lower Left) {pad2Pos && '✓'}
            </button>
          </div>
        </div>
      )}

      {/* Anatomical Mannequin Body Canvas (Scaled to fit without scrolling) */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative w-full max-w-[320px] sm:max-w-[380px] aspect-[3/4] max-h-[48vh] sm:max-h-[55vh] flex-1 min-h-0 bg-slate-900 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-2xl border border-slate-800 overflow-hidden cursor-pointer touch-none transition-transform ${
          chestSquash ? 'scale-[0.98]' : 'scale-100'
        } ${shockActive ? 'ring-8 ring-amber-400 bg-amber-950/40 animate-pulse' : ''}`}
      >
        <svg
          viewBox="0 0 300 400"
          className={`w-full h-full drop-shadow-xl transition-transform duration-75 ${
            chestSquash ? 'scale-y-[0.96] translate-y-1' : ''
          }`}
        >
          <defs>
            <linearGradient id="dummySkin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ebd4bf" />
              <stop offset="50%" stopColor="#dbbea4" />
              <stop offset="100%" stopColor="#caa78d" />
            </linearGradient>
          </defs>

          {/* Dummy Torso Base */}
          {/* Head & Neck */}
          <path
            d="M 125,20 C 125,8 175,8 175,20 L 178,55 C 190,58 200,64 210,72 L 90,72 C 100,64 110,58 122,55 Z"
            fill="url(#dummySkin)"
            stroke="#9f7b60"
            strokeWidth="2"
          />

          {/* Shoulders & Torso */}
          <path
            d="M 90,72 C 60,82 30,110 32,150 L 38,280 C 40,330 65,375 110,385 L 190,385 C 235,375 260,330 262,280 L 268,150 C 270,110 240,82 210,72 Z"
            fill="url(#dummySkin)"
            stroke="#8e6a50"
            strokeWidth="2.5"
          />

          {/* Collarbones */}
          <path d="M 115,78 Q 135,88 150,88 Q 165,88 185,78" fill="none" stroke="#ab856a" strokeWidth="3.5" strokeLinecap="round" />

          {/* Breastbone (Center) */}
          <rect x="143" y="118" width="14" height="65" rx="4" fill="#be977c" stroke="#7a573e" strokeWidth="1.5" />

          {/* Nipples Landmarks */}
          <circle cx="95" cy="165" r="4" fill="#a07559" />
          <circle cx="205" cy="165" r="4" fill="#a07559" />
          <line x1="95" y1="165" x2="205" y2="165" stroke="#a07559" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />

          {/* Navel */}
          <ellipse cx="150" cy="285" rx="5" ry="3" fill="#8e684e" />

          {/* Target Zone Box */}
          <rect
            x="138"
            y="155"
            width="24"
            height="26"
            rx="6"
            fill="none"
            stroke="#22c55e"
            strokeWidth={mode === 'hand_placement' ? '3' : '2'}
            strokeDasharray={mode === 'hand_placement' ? '4,2' : 'none'}
            className={mode === 'hand_placement' ? 'animate-pulse' : ''}
          />

          {/* AED Pad Guide Ghosts */}
          {mode === 'pad_placement' && (
            <>
              {/* Pad 1 Ghost: Right Upper */}
              <g opacity={pad1Pos ? '0.2' : '0.8'} className="transition-opacity">
                <rect x="78" y="115" width="46" height="44" rx="8" fill="#fef08a" stroke="#eab308" strokeWidth="2.5" strokeDasharray="4,3" />
                <text x="101" y="141" fill="#854d0e" fontSize="9" fontWeight="bold" textAnchor="middle">PAD 1 HERE</text>
              </g>

              {/* Pad 2 Ghost: Left Lower */}
              <g opacity={pad2Pos ? '0.2' : '0.8'} className="transition-opacity">
                <rect x="180" y="200" width="46" height="46" rx="8" fill="#fef08a" stroke="#eab308" strokeWidth="2.5" strokeDasharray="4,3" />
                <text x="203" y="227" fill="#854d0e" fontSize="9" fontWeight="bold" textAnchor="middle">PAD 2 HERE</text>
              </g>
            </>
          )}

          {/* Placed Pad 1 */}
          {pad1Pos && (
            <g transform={`translate(${(pad1Pos.x / 100) * 300 - 24}, ${(pad1Pos.y / 100) * 400 - 24})`}>
              <rect x="0" y="0" width="48" height="46" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="24" cy="23" r="14" fill="#0284c7" />
              <text x="24" y="27" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">PAD 1</text>
            </g>
          )}

          {/* Placed Pad 2 */}
          {pad2Pos && (
            <g transform={`translate(${(pad2Pos.x / 100) * 300 - 24}, ${(pad2Pos.y / 100) * 400 - 24})`}>
              <rect x="0" y="0" width="48" height="46" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
              <circle cx="24" cy="23" r="14" fill="#0284c7" />
              <text x="24" y="27" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">PAD 2</text>
            </g>
          )}
        </svg>

        {/* Hand in Hand Placement Mode */}
        {mode === 'hand_placement' && targetPos && (
          <div
            style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75"
          >
            <div className={`p-2.5 sm:p-3 rounded-full border-2 shadow-2xl flex items-center justify-center ${
              isHandValid 
                ? 'bg-emerald-500 border-emerald-200 text-white animate-pulse' 
                : 'bg-red-500 border-red-200 text-white'
            }`}>
              <Hand className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" />
            </div>
          </div>
        )}

        {/* ULTRA-OBVIOUS BLIPPING TARGET IN CPR MODE */}
        {mode === 'compressions' && (
          <>
            {/* Concentric Blipping Radar Rings */}
            <div
              style={{ left: '50%', top: '46%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10"
            >
              <div className="absolute w-36 h-36 rounded-full border-3 border-amber-400 bg-amber-400/20 animate-ping opacity-75" />
              <div className="absolute w-28 h-28 rounded-full border-3 border-yellow-300 bg-yellow-400/30 animate-ping opacity-90 [animation-delay:250ms]" />
              <div className="absolute w-20 h-20 rounded-full border-3 border-emerald-400 bg-emerald-400/30 animate-ping opacity-90 [animation-delay:500ms]" />
            </div>

            {/* Blipping Arrows Above Target */}
            <div
              style={{ left: '50%', top: '28%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center animate-bounce z-30"
            >
              <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xl border border-white animate-pulse">
                ⬇️ PUMP HERE! ⬇️
              </span>
            </div>

            {/* Core Blipping Bullseye on Center of Chest */}
            <div
              style={{ left: '50%', top: '46%' }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-all duration-75 flex flex-col items-center z-20 ${
                chestSquash ? 'scale-90 opacity-100' : 'scale-105 opacity-100'
              }`}
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 sm:border-4 border-yellow-300 bg-gradient-to-br from-amber-400 via-orange-500 to-amber-400 flex items-center justify-center shadow-xl shadow-amber-500/80 ring-4 sm:ring-6 ring-amber-400/50 animate-pulse">
                <Hand className="w-8 h-8 sm:w-10 sm:h-10 text-slate-950 fill-slate-950 drop-shadow-md" />
              </div>

              <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-950 border border-yellow-300 text-amber-300 text-[9px] font-black uppercase shadow-xl tracking-wider animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                TAP CHEST!
              </div>
            </div>

            {/* User Pulse Ripples */}
            {pulseRipples.map(ripple => (
              <div
                key={ripple.id}
                style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-3 border-emerald-400 animate-ping pointer-events-none opacity-80"
              />
            ))}
          </>
        )}

        {/* Shock Flash */}
        {shockActive && (
          <div className="absolute inset-0 bg-amber-300/40 mix-blend-screen flex items-center justify-center pointer-events-none">
            <Zap className="w-24 h-24 text-amber-200 animate-bounce" />
          </div>
        )}
      </div>
    </div>
  );
};
