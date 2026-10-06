/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Friendly, easy-to-understand game debrief & certificate downloader
 */

import React from 'react';
import { 
  Award, 
  Download, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Heart, 
  Zap, 
  User,
  Sparkles,
  Trophy
} from 'lucide-react';
import { SimulationReport } from '../types';
import { generateRCPCertificatePDF } from '../utils/rcpPdf';

interface DebriefReportProps {
  report: SimulationReport;
  onRestart: () => void;
}

export const DebriefReport: React.FC<DebriefReportProps> = ({
  report,
  onRestart
}) => {
  const isPass = report.result === 'PASS';
  const targetRatePct = Math.round((report.metrics.inTargetRateCount / Math.max(1, report.metrics.totalCompressions)) * 100);

  return (
    <div className="w-full h-full max-w-3xl mx-auto flex flex-col gap-3 py-1 overflow-y-auto pr-1">
      {/* Result Status Banner */}
      <div className={`rounded-2xl p-4 sm:p-6 border-2 shadow-xl relative overflow-hidden shrink-0 ${
        isPass 
          ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 border-emerald-500 text-white' 
          : 'bg-gradient-to-br from-red-950 via-slate-900 to-red-950 border-red-500 text-white'
      }`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${
              isPass ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30' : 'bg-red-500 text-white'
            }`}>
              {isPass ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>
            <div>
              <div className="text-xs font-bold tracking-wider uppercase text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                King Salman International Airport · Participation Report
              </div>
              <h1 className="text-2xl md:text-3xl font-black mt-0.5">
                {isPass ? 'YOU DID IT! YOU SAVED A LIFE!' : 'GAME OVER · DUMMY DID NOT SURVIVE'}
              </h1>
              <p className="text-sm text-slate-200 mt-1">
                {isPass 
                  ? 'Great job! You kept the blood pressure up, used the AED defibrillator correctly, and revived the dummy!'
                  : report.failureCause || 'The blood pressure fell too low. Try again and pump faster to keep the dummy alive!'}
              </p>
            </div>
          </div>

          <button
            onClick={() => generateRCPCertificatePDF(report)}
            className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download Participation Report (PDF)
          </button>
        </div>
      </div>

      {/* Player Card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-md">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 text-xs font-bold text-zinc-600 uppercase tracking-wider">
          <User className="w-4 h-4 text-blue-600" />
          PARTICIPANT REPORT DETAILS
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
          <div>
            <span className="text-zinc-500 block font-bold text-[11px]">Participant Name</span>
            <span className="font-extrabold text-zinc-950 text-sm">{report.student.name}</span>
          </div>
          <div>
            <span className="text-zinc-500 block font-bold text-[11px]">Badge ID</span>
            <span className="font-mono font-bold text-zinc-950 text-sm">{report.student.employeeId}</span>
          </div>
          <div>
            <span className="text-zinc-500 block font-bold text-[11px]">CPR Score</span>
            <span className="font-black text-emerald-600 text-base">{report.overallScore}/100</span>
          </div>
          <div>
            <span className="text-zinc-500 block font-bold text-[11px]">Status</span>
            <span className={`font-black text-sm ${isPass ? 'text-emerald-700' : 'text-red-600'}`}>
              {isPass ? 'COMPLETED · PARTICIPATED' : 'NEEDS PRACTICE'}
            </span>
          </div>
        </div>

        {/* Early AED Transition Penalty Breakdown (if triggered) */}
        {(report.metrics.earlyAedTriggered || report.earlyAedTriggered) && (
          <div className="mt-4 pt-3 border-t border-zinc-100 bg-red-50/80 rounded-2xl p-3 border border-red-200">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <Zap className="w-4 h-4 text-red-600 fill-red-600" />
                <span>Early AED Transition Applied:</span>
              </div>
              <span className="font-mono font-black text-sm text-red-600">
                -{report.earlyAedPenalty || report.metrics.earlyAedPenalty || 0} Points Penalty
              </span>
            </div>
            <p className="text-[11px] text-red-800 mt-1">
              Moved to AED {report.earlyAedSecondsShort || report.metrics.earlyAedSecondsShort || 0} seconds short of the standard 2-minute CPR cycle (10 point penalty per 20s short).
            </p>
          </div>
        )}
      </div>

      {/* 3 Simple Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Speed */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase">Pumping Speed (Rhythm)</span>
              <Heart className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono text-emerald-400 tabular-nums">
                {targetRatePct}%
              </div>
              <span className="text-xs text-slate-300">Of your pumps were at the ideal 100-120 speed</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between font-medium">
            <span>Total Pumps Done:</span>
            <span className="text-white font-bold">{report.metrics.totalCompressions} pumps</span>
          </div>
        </div>

        {/* Card 2: Hand Accuracy */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase">Hand Placement</span>
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono text-cyan-400 tabular-nums">
                {Math.round(report.metrics.handPlacementAccuracy)}%
              </div>
              <span className="text-xs text-slate-300">Aim on the center of the chest</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between font-medium">
            <span>Peak Pressure Created:</span>
            <span className="text-white font-bold">{Math.round(report.metrics.peakBloodPressure)} mmHg</span>
          </div>
        </div>

        {/* Card 3: Defibrillator */}
        <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase">Defibrillator (AED)</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black font-mono text-amber-400 tabular-nums">
                {Math.round((report.metrics.pad1Accuracy + report.metrics.pad2Accuracy) / 2)}%
              </div>
              <span className="text-xs text-slate-300">Pads placed in the correct spots</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between font-medium">
            <span>Bystanders Cleared:</span>
            <span className="text-emerald-400 font-bold">100% SAFE</span>
          </div>
        </div>
      </div>

      {/* Simple Checklist Audit */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-md">
        <h3 className="text-sm font-bold text-zinc-950 mb-3 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          What You Learned & Accomplished:
        </h3>

        <div className="divide-y divide-zinc-100 text-xs">
          {[
            { title: 'Checked scene safety first', note: 'Made sure no airport carts or hazards were near' },
            { title: 'Checked if the person was awake', note: 'Tapped shoulders and shouted to check response' },
            { title: 'Called for emergency help (997)', note: 'Told someone to bring the AED defibrillator' },
            { title: 'Recognized gasping as an emergency', note: 'Knew that gasping means heart stopped and started CPR immediately' },
            { title: 'Pumped the chest at the right speed', note: 'Kept the blood pressure gauge in the safe green zone' },
            { title: 'Used the AED safely', note: 'Stuck the pads on right chest and left ribs, and made sure everybody stood back' }
          ].map((row, idx) => (
            <div key={idx} className="py-2.5 flex items-center justify-between">
              <div>
                <span className="font-bold text-zinc-950 block">{row.title}</span>
                <span className="text-[11px] text-zinc-500">{row.note}</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                COMPLETED ✓
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          onClick={onRestart}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          Play Again / Practice More
        </button>

        <button
          onClick={() => generateRCPCertificatePDF(report)}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download Participation Report (PDF)
        </button>
      </div>
    </div>
  );
};
