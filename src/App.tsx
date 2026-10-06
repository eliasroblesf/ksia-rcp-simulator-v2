/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * King Salman International Airport (KSIA)
 * CPR & AED Life-Saver Game for Non-Medical Airport Trainees
 * Fully responsive, guaranteed to fit mobile phone screens (100dvh) without scrolling.
 * Includes pre-start overlay instruction on where to pump, 2-minute CPR countdown, and holding/dropping pressure gauge.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Heart, 
  Volume2, 
  VolumeX, 
  Activity, 
  RotateCcw, 
  WifiOff, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  Zap, 
  FastForward 
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { 
  SimulationStage, 
  StudentInfo, 
  HemodynamicState, 
  CPRMetrics, 
  SimulationReport 
} from './types';
import { soundEngine } from './utils/audio';
import { MannequinViewer } from './components/MannequinViewer';
import { HemodynamicMonitor } from './components/HemodynamicMonitor';
import { AEDUnit } from './components/AEDUnit';
import { StepSequence } from './components/StepSequence';
import { StudentRegistration } from './components/StudentRegistration';
import { DebriefReport } from './components/DebriefReport';
import { CPRActiveScreen } from './components/CPRActiveScreen';
import { generateRCPCertificatePDF } from './utils/rcpPdf';

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export default function App() {
  const isOnline = useOnlineStatus();
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);

  // App Navigation & State
  const [stage, setStage] = useState<SimulationStage>('registration');
  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [simulationMode, setSimulationMode] = useState<'exam' | 'practice'>('practice');
  const [pastReports, setPastReports] = useState<SimulationReport[]>([]);
  const [currentReport, setCurrentReport] = useState<SimulationReport | null>(null);
  const [failureReason, setFailureReason] = useState<string | null>(null);

  // Pumping Active State (paused while overlay instruction is showing)
  const [isPumpingActive, setIsPumpingActive] = useState<boolean>(false);

  // 2-Minute (120-second) CPR Countdown Timer State
  const [cprSecondsLeft, setCprSecondsLeft] = useState<number>(120);
  const [pressureTrend, setPressureTrend] = useState<'rising' | 'steady' | 'dropping'>('steady');
  const [gameScore, setGameScore] = useState<number>(0);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Hemodynamic State
  const [hemodynamics, setHemodynamics] = useState<HemodynamicState>({
    systolicBp: 20,
    diastolicBp: 10,
    map: 13,
    perfusionIndex: 12,
    rhythmBpm: 0,
    isAlive: true,
    criticalSecondsElapsed: 0,
    ecgState: 'vfib'
  });

  // Real-time Compression Tracking
  const compressionTimestamps = useRef<number[]>([]);
  const totalCompressionsRef = useRef<number>(0);
  const inTargetRateCountRef = useRef<number>(0);
  const adequateDepthRef = useRef<number>(0);
  const adequateRecoilRef = useRef<number>(0);
  const handPlacementAccuracyRef = useRef<number>(90);
  const pad1AccuracyRef = useRef<number>(0);
  const pad2AccuracyRef = useRef<number>(0);
  const peakBpRef = useRef<number>(20);
  const lowestBpRef = useRef<number>(100);
  const bpSumRef = useRef<number>(0);
  const bpSampleCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const shocksDeliveredRef = useRef<number>(0);
  const [postShockCompressions, setPostShockCompressions] = useState<number>(0);
  const prevBpRef = useRef<number>(20);

  // Early AED Transition Penalty Tracking (10 pt penalty for every 20s short of 2 min)
  const [earlyAedPenalty, setEarlyAedPenalty] = useState<number>(0);
  const [earlyAedSecondsShort, setEarlyAedSecondsShort] = useState<number>(0);
  const [earlyAedTriggered, setEarlyAedTriggered] = useState<boolean>(false);
  const earlyAedPenaltyRef = useRef<number>(0);
  const earlyAedSecondsShortRef = useRef<number>(0);
  const earlyAedTriggeredRef = useRef<boolean>(false);

  // Load past reports
  useEffect(() => {
    const saved = localStorage.getItem('ksia_rcp_reports');
    if (saved) {
      try {
        setPastReports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse past reports', e);
      }
    }
  }, []);

  const saveReportToStorage = useCallback((report: SimulationReport) => {
    const updated = [report, ...pastReports];
    setPastReports(updated);
    localStorage.setItem('ksia_rcp_reports', JSON.stringify(updated));
  }, [pastReports]);

  // Master Metronome Synchronization:
  // "The metronome shall only work when there is a pumping practice."
  useEffect(() => {
    const isCurrentlyInPumpingPractice = 
      (stage === 'cpr_compressions' || stage === 'cpr_post_shock') &&
      isPumpingActive &&
      hemodynamics.isAlive &&
      simulationMode === 'practice' &&
      metronomeEnabled &&
      !isMuted;

    if (isCurrentlyInPumpingPractice) {
      soundEngine.startMetronome(110);
    } else {
      soundEngine.stopMetronome();
    }

    return () => {
      soundEngine.stopMetronome();
    };
  }, [stage, isPumpingActive, hemodynamics.isAlive, simulationMode, metronomeEnabled, isMuted]);

  // Audio Controls
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
  };

  const handleToggleMetronome = () => {
    setMetronomeEnabled(prev => !prev);
  };

  // Early AED Transition action (student can choose to move from RCP to AED at any moment)
  const handleSwitchToAedEarly = useCallback((penalty: number, secondsShort: number) => {
    setEarlyAedPenalty(penalty);
    setEarlyAedSecondsShort(secondsShort);
    setEarlyAedTriggered(true);
    earlyAedPenaltyRef.current = penalty;
    earlyAedSecondsShortRef.current = secondsShort;
    earlyAedTriggeredRef.current = true;

    // Immediately stop active pumping and metronome audio
    setIsPumpingActive(false);
    soundEngine.stopMetronome();
    soundEngine.playWarning();

    // Advance immediately to AED pad attachment
    setStage('aed_dispatch_pads');
  }, []);

  // Start Simulation from Registration
  const handleStartSimulation = (trainee: StudentInfo, mode: 'exam' | 'practice') => {
    setStudent(trainee);
    setSimulationMode(mode);
    setFailureReason(null);
    setCurrentReport(null);
    setPostShockCompressions(0);
    setCprSecondsLeft(120); // 2 full minutes
    setGameScore(0);
    setStreakCount(0);
    setPressureTrend('steady');
    setIsPumpingActive(false);

    // Reset early AED penalty tracking
    setEarlyAedPenalty(0);
    setEarlyAedSecondsShort(0);
    setEarlyAedTriggered(false);
    earlyAedPenaltyRef.current = 0;
    earlyAedSecondsShortRef.current = 0;
    earlyAedTriggeredRef.current = false;

    // Reset metrics
    compressionTimestamps.current = [];
    totalCompressionsRef.current = 0;
    inTargetRateCountRef.current = 0;
    adequateDepthRef.current = 0;
    adequateRecoilRef.current = 0;
    handPlacementAccuracyRef.current = 85;
    pad1AccuracyRef.current = 0;
    pad2AccuracyRef.current = 0;
    peakBpRef.current = 20;
    lowestBpRef.current = 100;
    bpSumRef.current = 0;
    bpSampleCountRef.current = 0;
    shocksDeliveredRef.current = 0;
    startTimeRef.current = Date.now();
    prevBpRef.current = 20;

    setHemodynamics({
      systolicBp: 25,
      diastolicBp: 12,
      map: 16,
      perfusionIndex: 15,
      rhythmBpm: 0,
      isAlive: true,
      criticalSecondsElapsed: 0,
      ecgState: 'vfib'
    });

    if (mode === 'practice') {
      setMetronomeEnabled(true);
    } else {
      setMetronomeEnabled(false);
    }

    setStage('scene_assessment');
  };

  // Fail simulation / Dummy dies
  const handleGameOver = useCallback((reason: string) => {
    soundEngine.stopMetronome();
    soundEngine.playFlatline();
    setIsPumpingActive(false);

    setHemodynamics(prev => ({
      ...prev,
      isAlive: false,
      systolicBp: 0,
      diastolicBp: 0,
      map: 0,
      perfusionIndex: 0,
      rhythmBpm: 0,
      ecgState: 'asystole'
    }));

    setFailureReason(reason);

    const durationSec = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const meanBp = bpSampleCountRef.current > 0 ? Math.round(bpSumRef.current / bpSampleCountRef.current) : 25;
    const rawScore = Math.min(60, Math.round(gameScore / 20));
    const finalScore = Math.max(0, rawScore - earlyAedPenaltyRef.current);

    const report: SimulationReport = {
      id: uuidv4(),
      student: student || {
        name: 'Player',
        employeeId: 'N/A',
        department: 'Airport Staff',
        shift: 'Day Shift',
        badgeNumber: 'KSIA',
        facility: 'Terminal Gate',
        trainingDate: new Date().toISOString()
      },
      startedAt: new Date(startTimeRef.current || Date.now()).toISOString(),
      completedAt: new Date().toISOString(),
      result: 'FAIL',
      overallScore: finalScore,
      failureCause: reason,
      earlyAedPenalty: earlyAedPenaltyRef.current,
      earlyAedSecondsShort: earlyAedSecondsShortRef.current,
      earlyAedTriggered: earlyAedTriggeredRef.current,
      metrics: {
        totalCompressions: totalCompressionsRef.current,
        inTargetRateCount: inTargetRateCountRef.current,
        adequateDepthCount: adequateDepthRef.current,
        adequateRecoilCount: adequateRecoilRef.current,
        handPlacementAccuracy: handPlacementAccuracyRef.current,
        pad1Accuracy: pad1AccuracyRef.current,
        pad2Accuracy: pad2AccuracyRef.current,
        handsOffTimeSec: 8,
        totalDurationSec: durationSec,
        chestCompressionFraction: 45,
        meanBloodPressure: meanBp,
        peakBloodPressure: peakBpRef.current,
        lowestBloodPressure: lowestBpRef.current,
        shocksDelivered: shocksDeliveredRef.current,
        shockClearanceVerified: false,
        roscAchieved: false,
        earlyAedPenalty: earlyAedPenaltyRef.current,
        earlyAedSecondsShort: earlyAedSecondsShortRef.current,
        earlyAedTriggered: earlyAedTriggeredRef.current
      },
      hemodynamicPeakMap: Math.round(peakBpRef.current * 0.65),
      stepsCompleted: [],
      evaluatorRemarks: [
        'Game ended: The dummy lost blood pressure for too long.',
        reason,
        earlyAedTriggeredRef.current
          ? `Early AED transition penalty applied: -${earlyAedPenaltyRef.current} pts (${earlyAedSecondsShortRef.current}s short of 2-minute CPR standard).`
          : 'Remember to pump continuously at 100-120 pumps per minute!'
      ]
    };

    saveReportToStorage(report);
    setCurrentReport(report);
    setStage('game_over');
  }, [student, gameScore, saveReportToStorage]);

  // Hand Placement confirmed -> move to pumping screen with overlay
  const handleHandPlacementConfirmed = (accuracy: number) => {
    handPlacementAccuracyRef.current = accuracy;
    soundEngine.playSuccess();
    setIsPumpingActive(false); // Keeps timer paused until overlay is confirmed
    setStage('cpr_compressions');
  };

  // Compression Pulse Action (Tapping or Spacebar)
  const handleCompressionPulse = useCallback(() => {
    if (stage !== 'cpr_compressions' && stage !== 'cpr_post_shock') return;
    if (!hemodynamics.isAlive) return;

    const now = Date.now();
    const timestamps = compressionTimestamps.current;
    timestamps.push(now);

    const cutoff = now - 4000;
    while (timestamps.length > 0 && timestamps[0] < cutoff) {
      timestamps.shift();
    }

    let currentBpm = 0;
    if (timestamps.length >= 2) {
      const recentIntervals: number[] = [];
      for (let i = timestamps.length - 1; i > Math.max(0, timestamps.length - 5); i--) {
        recentIntervals.push(timestamps[i] - timestamps[i - 1]);
      }
      const avgIntervalMs = recentIntervals.reduce((a, b) => a + b, 0) / recentIntervals.length;
      currentBpm = Math.round((60000 / avgIntervalMs));
    }

    totalCompressionsRef.current += 1;

    const isInOptimalRate = currentBpm >= 100 && currentBpm <= 120;
    if (isInOptimalRate) {
      inTargetRateCountRef.current += 1;
      setStreakCount(s => s + 1);
      setGameScore(sc => sc + 50);
    } else {
      setStreakCount(0);
      setGameScore(sc => sc + 20);
    }

    adequateDepthRef.current += 1;
    adequateRecoilRef.current += 1;

    setHemodynamics(prev => {
      const handFactor = handPlacementAccuracyRef.current / 100;
      const rateFactor = isInOptimalRate ? 1.0 : currentBpm >= 80 && currentBpm <= 140 ? 0.75 : 0.45;
      const deltaSystolic = (5.5 + Math.random() * 2) * handFactor * rateFactor;

      const newSys = Math.min(115, prev.systolicBp + deltaSystolic);
      const newDia = Math.round(newSys * 0.48);
      const newMap = Math.round(newDia + (newSys - newDia) / 3);
      const newPerfusion = Math.min(100, Math.round((newMap / 70) * 100));

      if (newSys > peakBpRef.current) peakBpRef.current = newSys;
      if (newSys < lowestBpRef.current && newSys > 0) lowestBpRef.current = newSys;
      bpSumRef.current += newSys;
      bpSampleCountRef.current += 1;

      // Update Trend
      if (newSys > prevBpRef.current + 1.5) {
        setPressureTrend('rising');
      } else if (newSys >= 70) {
        setPressureTrend('steady');
      }
      prevBpRef.current = newSys;

      return {
        ...prev,
        systolicBp: newSys,
        diastolicBp: newDia,
        map: newMap,
        perfusionIndex: newPerfusion,
        rhythmBpm: currentBpm,
        criticalSecondsElapsed: 0,
        ecgState: prev.ecgState === 'sinus' ? 'sinus' : 'cpr_spike'
      };
    });

    // Post-shock track
    if (stage === 'cpr_post_shock') {
      setPostShockCompressions(prev => {
        const next = prev + 1;
        if (next >= 18) {
          triggerROSC();
        }
        return next;
      });
    }
  }, [stage, hemodynamics.isAlive]);

  // 2-Minute (120-Second) Countdown Timer Loop (Only active when isPumpingActive is true)
  useEffect(() => {
    if (stage !== 'cpr_compressions' || !isPumpingActive) return;
    if (!hemodynamics.isAlive) return;

    const timer = setInterval(() => {
      setCprSecondsLeft(prev => {
        if (prev <= 1) {
          // 2 Minutes completed! AED Arrives!
          clearInterval(timer);
          soundEngine.playSuccess();
          setIsPumpingActive(false);
          setStage('aed_dispatch_pads');
          return 0;
        }

        // Mid-game announcements audio cues
        if (prev === 60) {
          soundEngine.playHeartBeep(800);
        } else if (prev === 15) {
          soundEngine.playWarning();
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, isPumpingActive, hemodynamics.isAlive]);

  // Natural Blood Pressure Decay Loop (every 100ms, paused while overlay is visible)
  useEffect(() => {
    if ((stage !== 'cpr_compressions' && stage !== 'cpr_post_shock') || !isPumpingActive) return;
    if (!hemodynamics.isAlive) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const lastTap = compressionTimestamps.current[compressionTimestamps.current.length - 1] || 0;
      const elapsedSinceTap = (now - lastTap) / 1000;

      setHemodynamics(prev => {
        let newSys = prev.systolicBp;
        let newCritical = prev.criticalSecondsElapsed;
        let newBpm = prev.rhythmBpm;

        if (elapsedSinceTap > 0.6) {
          const decay = 1.0;
          newSys = Math.max(15, prev.systolicBp - decay);
          newBpm = Math.max(0, Math.round(prev.rhythmBpm * 0.9));

          // Set trend to dropping!
          setPressureTrend('dropping');
          setStreakCount(0);
        } else if (newSys >= 70 && pressureTrend !== 'rising') {
          setPressureTrend('steady');
        }

        const newDia = Math.round(newSys * 0.48);
        const newMap = Math.round(newDia + (newSys - newDia) / 3);
        const newPerfusion = Math.min(100, Math.round((newMap / 70) * 100));

        if (newSys < 45) {
          newCritical += 0.1;
          if (newCritical >= 4.0) {
            handleGameOver('Blood pressure dropped below the safe zone (< 45 mmHg) for more than 4 seconds. The dummy passed away.');
            return prev;
          }
        } else {
          newCritical = Math.max(0, newCritical - 0.2);
        }

        prevBpRef.current = newSys;

        return {
          ...prev,
          systolicBp: newSys,
          diastolicBp: newDia,
          map: newMap,
          perfusionIndex: newPerfusion,
          rhythmBpm: newBpm,
          criticalSecondsElapsed: newCritical
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [stage, isPumpingActive, hemodynamics.isAlive, pressureTrend, handleGameOver]);

  // Fast forward helper for quick testing (e.g. advance 30s)
  const handleFastForwardCpr = () => {
    setCprSecondsLeft(prev => Math.max(5, prev - 30));
  };

  // Dummy Revived! (Victory)
  const triggerROSC = useCallback(() => {
    soundEngine.playSuccess();
    soundEngine.playHeartBeep(880);
    setIsPumpingActive(false);

    setHemodynamics({
      systolicBp: 118,
      diastolicBp: 76,
      map: 90,
      perfusionIndex: 98,
      rhythmBpm: 76,
      isAlive: true,
      criticalSecondsElapsed: 0,
      ecgState: 'sinus'
    });

    const durationSec = Math.max(1, Math.round((Date.now() - (startTimeRef.current || Date.now())) / 1000));
    const meanBp = bpSampleCountRef.current > 0 ? Math.round(bpSumRef.current / bpSampleCountRef.current) : 88;
    const targetRatePct = Math.round((inTargetRateCountRef.current / Math.max(1, totalCompressionsRef.current)) * 100);

    const rawScore = Math.min(100, Math.round((targetRatePct * 0.4) + (handPlacementAccuracyRef.current * 0.3) + 30));
    const finalScore = Math.max(0, Math.min(100, rawScore - earlyAedPenaltyRef.current));

    const remarks = [
      'Awesome job! You successfully saved the dummy!',
      earlyAedTriggeredRef.current
        ? `Early AED Switch: Moved to AED ${earlyAedSecondsShortRef.current}s short of 2-minute CPR standard (-${earlyAedPenaltyRef.current} pts penalty applied).`
        : 'You maintained chest compressions throughout the full 2-minute round.',
      `Pumping speed was on target for ${targetRatePct}% of the time.`,
      'Defibrillator pads were attached correctly and shocked safely.',
      'The dummy was revived and breathing normally!'
    ];

    const report: SimulationReport = {
      id: uuidv4(),
      student: student || {
        name: 'Player',
        employeeId: 'N/A',
        department: 'Airport Staff',
        shift: 'Day Shift',
        badgeNumber: 'KSIA',
        facility: 'Terminal Gate',
        trainingDate: new Date().toISOString()
      },
      startedAt: new Date(startTimeRef.current || Date.now()).toISOString(),
      completedAt: new Date().toISOString(),
      result: 'PASS',
      overallScore: finalScore,
      earlyAedPenalty: earlyAedPenaltyRef.current,
      earlyAedSecondsShort: earlyAedSecondsShortRef.current,
      earlyAedTriggered: earlyAedTriggeredRef.current,
      metrics: {
        totalCompressions: totalCompressionsRef.current,
        inTargetRateCount: inTargetRateCountRef.current,
        adequateDepthCount: adequateDepthRef.current,
        adequateRecoilCount: adequateRecoilRef.current,
        handPlacementAccuracy: handPlacementAccuracyRef.current,
        pad1Accuracy: pad1AccuracyRef.current,
        pad2Accuracy: pad2AccuracyRef.current,
        handsOffTimeSec: 4.2,
        totalDurationSec: durationSec,
        chestCompressionFraction: 86,
        meanBloodPressure: meanBp,
        peakBloodPressure: peakBpRef.current,
        lowestBloodPressure: lowestBpRef.current,
        shocksDelivered: shocksDeliveredRef.current,
        shockClearanceVerified: true,
        roscAchieved: true,
        earlyAedPenalty: earlyAedPenaltyRef.current,
        earlyAedSecondsShort: earlyAedSecondsShortRef.current,
        earlyAedTriggered: earlyAedTriggeredRef.current
      },
      hemodynamicPeakMap: Math.round(peakBpRef.current * 0.65),
      stepsCompleted: [],
      evaluatorRemarks: remarks
    };

    saveReportToStorage(report);
    setCurrentReport(report);

    setTimeout(() => {
      setStage('debrief_report');
    }, 2000);
  }, [student, saveReportToStorage]);

  // AED Pad Placement Callback
  const handlePadsPlaced = (acc1: number, acc2: number) => {
    pad1AccuracyRef.current = acc1;
    pad2AccuracyRef.current = acc2;
    soundEngine.playSuccess();
    setStage('aed_analysis_shock');
  };

  // Shock Delivered Callback
  const handleShockDelivered = () => {
    shocksDeliveredRef.current += 1;
  };

  // Resume CPR post shock
  const handleResumePostShock = () => {
    setIsPumpingActive(true);
    setStage('cpr_post_shock');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none selection:bg-blue-600 selection:text-white">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-bold py-1 px-3 text-center flex items-center justify-center gap-1.5 shrink-0">
          <WifiOff className="w-3 h-3" />
          OFFLINE MODE ACTIVE · PLAYING LOCALLY
        </div>
      )}

      {/* Top Bar (Compact on mobile to save vertical space) */}
      <header className="h-12 sm:h-14 border-b border-slate-800 bg-slate-950/95 px-3 sm:px-6 flex items-center justify-between shrink-0 z-40">
        {/* Brand Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-600/30">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <span className="font-extrabold text-white text-sm sm:text-base tracking-tight whitespace-nowrap">
            KSIA CPR Life-Saver
          </span>
        </div>

        {/* Subtitle labels (visible on md+) */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-medium">
          <span>Airport Training</span>
          <span aria-hidden="true">·</span>
          <span>2-Min Countdown</span>
          <span aria-hidden="true">·</span>
          <span>AED Dispatch</span>
        </div>

        {/* Helper Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={handleToggleMetronome}
            title={
              (stage === 'cpr_compressions' || stage === 'cpr_post_shock') && isPumpingActive
                ? 'Rhythm Metronome active (110 BPM)'
                : 'Rhythm Metronome will activate during pumping practice (110 BPM)'
            }
            className={`px-2 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              metronomeEnabled 
                ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-xs' 
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span className="hidden sm:inline">
              Rhythm (110 BPM){metronomeEnabled && ((stage === 'cpr_compressions' || stage === 'cpr_post_shock') && isPumpingActive) ? ' · Playing' : ''}
            </span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* Main Game Screen (Guaranteed to fit 100dvh without scrolling) */}
      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 flex flex-col overflow-hidden">
        {/* Stage 1: Player Registration */}
        {stage === 'registration' && (
          <StudentRegistration
            onStartSimulation={handleStartSimulation}
            pastReports={pastReports}
          />
        )}

        {/* Stage 2: Step-by-Step Game Decisions */}
        {stage === 'scene_assessment' && (
          <div className="w-full h-full max-w-2xl mx-auto flex flex-col justify-center overflow-hidden py-1">
            <StepSequence
              currentStepIndex={0}
              onAdvanceToHandPlacement={() => setStage('hand_placement')}
              onClinicalDecisionFail={(reason) => handleGameOver(reason)}
            />
          </div>
        )}

        {/* Stage 3: Target Practice - Hand Placement */}
        {stage === 'hand_placement' && (
          <div className="w-full h-full max-w-md mx-auto flex flex-col justify-between items-center overflow-hidden py-1">
            <div className="w-full flex items-center justify-between text-[11px] text-slate-300 px-1 font-bold shrink-0">
              <span className="truncate">PLAYER: {student?.name}</span>
              <span className="text-amber-400 font-extrabold shrink-0">AIM HANDS AT CHEST</span>
            </div>

            <MannequinViewer
              mode="hand_placement"
              onHandPlacementConfirm={handleHandPlacementConfirmed}
            />
          </div>
        )}

        {/* Stage 4: 2-Minute CPR Countdown & Unified Pumping Screen */}
        {stage === 'cpr_compressions' && (
          <CPRActiveScreen
            hemodynamics={hemodynamics}
            cprSecondsLeft={cprSecondsLeft}
            totalSeconds={120}
            pressureTrend={pressureTrend}
            gameScore={gameScore}
            streakCount={streakCount}
            totalCompressions={totalCompressionsRef.current}
            studentName={student?.name}
            isPumpingActive={isPumpingActive}
            onStartPumping={() => setIsPumpingActive(true)}
            onPausePumping={() => setIsPumpingActive(false)}
            onResumePumping={() => setIsPumpingActive(true)}
            onCompress={handleCompressionPulse}
            onFastForward={handleFastForwardCpr}
            onSwitchToAedEarly={handleSwitchToAedEarly}
            simulationMode={simulationMode}
            metronomeEnabled={metronomeEnabled}
          />
        )}

        {/* Stage 5: AED Arrives - Stick the Pads */}
        {stage === 'aed_dispatch_pads' && (
          <div className="w-full h-full max-w-md mx-auto flex flex-col justify-between items-center overflow-hidden py-1">
            <div className={`w-full p-2 rounded-xl text-slate-950 flex items-center justify-between shadow-lg shrink-0 ${
              earlyAedTriggered ? 'bg-gradient-to-r from-red-400 to-amber-400' : 'bg-amber-500'
            }`}>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 fill-slate-950 text-slate-950 shrink-0" />
                <div>
                  <div className="font-black text-xs uppercase leading-tight">
                    {earlyAedTriggered 
                      ? `EARLY AED DEPLOYMENT (-${earlyAedPenalty} PTS PENALTY)` 
                      : '2 MINUTES DONE! AED ARRIVED!'}
                  </div>
                  <div className="text-[10px] font-bold text-slate-900 leading-tight">
                    {earlyAedTriggered 
                      ? `Moved to AED ${earlyAedSecondsShort}s short of 2-minute CPR. Stick the 2 pads onto bare chest!` 
                      : "Stick the 2 yellow pads onto the dummy's bare chest!"}
                  </div>
                </div>
              </div>
            </div>

            <MannequinViewer
              mode="pad_placement"
              onPadsPlaced={handlePadsPlaced}
            />
          </div>
        )}

        {/* Stage 6: AED Screen & Shock */}
        {stage === 'aed_analysis_shock' && (
          <div className="w-full h-full max-w-md mx-auto flex flex-col justify-center overflow-hidden py-1">
            <AEDUnit
              onShockDelivered={handleShockDelivered}
              onPostShockResume={handleResumePostShock}
              earlyAedTriggered={earlyAedTriggered}
              earlyAedPenalty={earlyAedPenalty}
            />
          </div>
        )}

        {/* Stage 7: Wake the Dummy Up (Post-Shock CPR) */}
        {stage === 'cpr_post_shock' && (
          <CPRActiveScreen
            hemodynamics={hemodynamics}
            cprSecondsLeft={Math.max(0, 18 - postShockCompressions)}
            totalSeconds={18}
            pressureTrend={pressureTrend}
            gameScore={gameScore}
            streakCount={streakCount}
            totalCompressions={totalCompressionsRef.current}
            studentName={student?.name}
            isPumpingActive={true}
            onStartPumping={() => {}}
            onCompress={handleCompressionPulse}
            onFastForward={() => setPostShockCompressions(17)}
            simulationMode={simulationMode}
            metronomeEnabled={metronomeEnabled}
            postShockMode={true}
            postShockCount={postShockCompressions}
            postShockTarget={18}
          />
        )}

        {/* Stage 8: Debrief Report & Participation Report PDF */}
        {stage === 'debrief_report' && currentReport && (
          <DebriefReport
            report={currentReport}
            onRestart={() => setStage('registration')}
          />
        )}

        {/* Stage 9: Game Over Screen */}
        {stage === 'game_over' && (
          <div className="w-full h-full max-w-sm mx-auto flex flex-col items-center justify-center text-center gap-3 p-3 overflow-hidden">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-950 border-3 border-red-500 text-red-400 flex items-center justify-center shadow-xl animate-bounce shrink-0">
              <Activity className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div>
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
                GAME OVER
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                The Dummy Didn't Make It
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto leading-relaxed">
                {failureReason || 'Blood pressure dropped into the red zone for more than 4 seconds. Tap continuously next time!'}
              </p>
            </div>

            {currentReport && (
              <button
                onClick={() => generateRCPCertificatePDF(currentReport)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase flex items-center gap-1.5 border border-zinc-700 shadow-md cursor-pointer shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                Download Participation Report (PDF)
              </button>
            )}

            <button
              onClick={() => setStage('registration')}
              className="w-full py-2.5 sm:py-3 px-6 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl active:scale-95 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again (Play New Round)
            </button>
          </div>
        )}
      </main>

      {/* Footer (Hidden on mobile to ensure zero vertical scrolling during gameplay) */}
      <footer className="hidden sm:flex border-t border-slate-900 bg-slate-950 py-1.5 px-4 text-center text-[10px] text-slate-500 items-center justify-between shrink-0">
        <span>© 2026 King Salman International Airport · First Aid Training Game</span>
        <span>Easy CPR & AED Skills for Everyone</span>
      </footer>
    </div>
  );
}
