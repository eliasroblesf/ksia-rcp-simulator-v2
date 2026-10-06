/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Compact, Phone-First Onboarding Screen
 * Fits inside a mobile screen (100dvh) without scrolling.
 */

import React, { useState } from 'react';
import { User, Play, Award, FileText, BadgeCheck, Heart, Sparkles, ShieldCheck } from 'lucide-react';
import { StudentInfo, SimulationReport } from '../types';
import { format } from 'date-fns';
import { generateRCPCertificatePDF } from '../utils/rcpPdf';

interface StudentRegistrationProps {
  onStartSimulation: (student: StudentInfo, mode: 'exam' | 'practice') => void;
  pastReports: SimulationReport[];
}

export const StudentRegistration: React.FC<StudentRegistrationProps> = ({
  onStartSimulation,
  pastReports
}) => {
  const [name, setName] = useState<string>('');
  const [employeeBadge, setEmployeeBadge] = useState<string>('');
  const [mode, setMode] = useState<'exam' | 'practice'>('practice');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please type your name to start.');
      return;
    }
    if (!employeeBadge.trim()) {
      setErrorMessage('Please enter your employee badge ID.');
      return;
    }

    setErrorMessage(null);
    onStartSimulation(
      {
        name: name.trim(),
        employeeId: employeeBadge.trim(),
        badgeNumber: employeeBadge.trim(),
        department: 'Airport Team Member',
        shift: 'Day Shift',
        facility: 'Terminal Concourse',
        trainingDate: format(new Date(), 'yyyy-MM-dd')
      },
      mode
    );
  };

  return (
    <div className="w-full h-full max-w-md mx-auto flex flex-col justify-between py-1 px-1 sm:px-2 select-none overflow-hidden">
      {/* Top Banner (Compact) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 border border-blue-500/40 shadow-xl flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md">
            <Heart className="w-4 h-4 fill-slate-950 text-slate-950" />
          </div>
          <div>
            <div className="text-[9px] font-bold text-amber-300 uppercase tracking-wide">
              KSIA AIRPORT DRILL
            </div>
            <h1 className="text-xs sm:text-sm font-extrabold text-white leading-tight">
              CPR & AED Life-Saver Game
            </h1>
          </div>
        </div>

        {pastReports.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="px-2 py-1 rounded-lg bg-blue-800/80 hover:bg-blue-700 text-amber-300 border border-blue-400/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Award className="w-3 h-3" />
            <span>PDFs ({pastReports.length})</span>
          </button>
        )}
      </div>

      {/* Main Registration Card (Fits Phone Screen) */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-zinc-200 shadow-xl flex-1 my-1.5 flex flex-col justify-between min-h-0">
        <div>
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
            <div className="p-1 rounded-lg bg-blue-100 text-blue-700">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-zinc-950">Player Registration</h2>
              <p className="text-[10px] text-zinc-500">Name & Badge for your Participation Report.</p>
            </div>
          </div>

          <form id="regForm" onSubmit={handleSubmit} className="mt-2.5 space-y-2">
            {errorMessage && (
              <div className="p-1.5 rounded-lg bg-red-100 border border-red-300 text-red-950 text-[11px] font-bold">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-zinc-950 uppercase tracking-wider mb-0.5">
                Your Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fahad Al-Zahrani"
                className="w-full px-3 py-1.5 sm:py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold border-2 border-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600 shadow-xs caret-blue-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-950 uppercase tracking-wider mb-0.5">
                Employee Badge ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeBadge}
                onChange={(e) => setEmployeeBadge(e.target.value)}
                placeholder="e.g. KSIA-1234"
                className="w-full px-3 py-1.5 sm:py-2 rounded-lg bg-white text-zinc-950 text-xs font-bold font-mono border-2 border-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600 shadow-xs caret-blue-700"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-950 uppercase tracking-wider mb-0.5">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('practice')}
                  className={`p-1.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    mode === 'practice'
                      ? 'bg-emerald-50 border-emerald-600 ring-1 ring-emerald-500'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <span className="font-bold text-zinc-950 block text-[11px]">Practice</span>
                  <span className="text-[9px] text-zinc-500 block leading-tight">With 110 BPM rhythm ticks</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('exam')}
                  className={`p-1.5 rounded-lg border-2 text-left transition-all cursor-pointer ${
                    mode === 'exam'
                      ? 'bg-blue-50 border-blue-600 ring-1 ring-blue-500'
                      : 'bg-zinc-50 border-zinc-200'
                  }`}
                >
                  <span className="font-bold text-zinc-950 block text-[11px]">Exam</span>
                  <span className="text-[9px] text-zinc-500 block leading-tight">Survival clock</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <button
          type="submit"
          form="regForm"
          className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          START CPR GAME NOW →
        </button>
      </div>

      {/* History Modal if requested */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-2xl p-4 border shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex items-center justify-between pb-2 border-b">
              <h3 className="font-black text-xs sm:text-sm text-zinc-950">Your Past Participation Reports</h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>
            <div className="overflow-y-auto space-y-1.5 py-2 flex-1">
              {pastReports.map((report) => (
                <div key={report.id} className="p-2 bg-zinc-50 rounded-lg border text-xs flex items-center justify-between">
                  <div>
                    <span className="font-bold text-zinc-900 block text-[11px]">{report.student.name}</span>
                    <span className="text-[9px] text-zinc-500">{report.student.trainingDate}</span>
                  </div>
                  <button
                    onClick={() => generateRCPCertificatePDF(report)}
                    className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <FileText className="w-3 h-3" /> PDF
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Quiet Note */}
      <div className="text-[9px] text-slate-500 font-mono text-center shrink-0">
        King Salman International Airport · Emergency Training
      </div>
    </div>
  );
};
