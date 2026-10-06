/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Easy-to-understand, gamified step-by-step decision sequence for non-medical trainees
 * Fully responsive and optimized to fit mobile phone screens (100dvh) without scrolling.
 */

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  UserCheck, 
  PhoneCall, 
  HeartPulse, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { soundEngine } from '../utils/audio';

interface StepSequenceProps {
  currentStepIndex: number;
  onAdvanceToHandPlacement: () => void;
  onClinicalDecisionFail: (reason: string) => void;
}

export const StepSequence: React.FC<StepSequenceProps> = ({
  onAdvanceToHandPlacement,
  onClinicalDecisionFail
}) => {
  const [internalStep, setInternalStep] = useState<number>(0);
  const [sceneSafetyConfirmed, setSceneSafetyConfirmed] = useState<boolean>(false);
  const [responseChecked, setResponseChecked] = useState<boolean>(false);
  const [dispatchCalled, setDispatchCalled] = useState<boolean>(false);
  const [pulseChecked, setPulseChecked] = useState<boolean>(false);
  const [decisionSelected, setDecisionSelected] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Step 1: Scene Safety
  const handleConfirmSceneSafety = () => {
    setSceneSafetyConfirmed(true);
    soundEngine.playHeartBeep(600);
    setTimeout(() => setInternalStep(1), 400);
  };

  // Step 2: Check Responsiveness
  const handleCheckResponse = () => {
    setResponseChecked(true);
    soundEngine.playHeartBeep(650);
    setTimeout(() => setInternalStep(2), 400);
  };

  // Step 3: Call 997 & AED
  const handleCallDispatch = () => {
    setDispatchCalled(true);
    soundEngine.playHeartBeep(700);
    setTimeout(() => setInternalStep(3), 400);
  };

  // Step 4: Check Breathing
  const handleCheckPulseAndBreathing = () => {
    setPulseChecked(true);
    soundEngine.playHeartBeep(750);
    setTimeout(() => setInternalStep(4), 400);
  };

  // Step 5: Critical Decision: To CPR or Not?
  const handleDecision = (choiceId: string) => {
    setDecisionSelected(choiceId);

    if (choiceId === 'cpr_immediate') {
      soundEngine.playSuccess();
      setFeedbackMessage({
        text: 'EXCELLENT CHOICE! Gasping is NOT normal breathing. Their heart has stopped and they need CPR right away!',
        isError: false
      });
      setTimeout(() => {
        onAdvanceToHandPlacement();
      }, 1500);
    } else {
      soundEngine.playWarning();
      const reasons: Record<string, string> = {
        'recovery_position': 'Rolling someone on their side when their heart stopped wastes critical minutes! Start CPR immediately.',
        'wait_breathing': 'Gasping is only a brain reflex, not real breathing! They need CPR immediately.',
        'give_water': 'Never give water to an unconscious person! Start CPR immediately.'
      };
      const reason = reasons[choiceId] || 'Wrong choice! When someone is not breathing normally and has no pulse, you must start CPR right away.';
      setFeedbackMessage({
        text: reason,
        isError: true
      });
      setTimeout(() => {
        onClinicalDecisionFail(reason);
      }, 2200);
    }
  };

  return (
    <div className="w-full h-full max-h-full bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between text-white overflow-hidden">
      {/* Friendly Game Progress Bar */}
      <div className="grid grid-cols-5 gap-1.5 border-b border-slate-800 pb-2 shrink-0">
        {[
          { label: '1. Area', done: sceneSafetyConfirmed, active: internalStep === 0 },
          { label: '2. Awake?', done: responseChecked, active: internalStep === 1 },
          { label: '3. Call 997', done: dispatchCalled, active: internalStep === 2 },
          { label: '4. Breath', done: pulseChecked, active: internalStep === 3 },
          { label: '5. Decision', done: decisionSelected === 'cpr_immediate', active: internalStep === 4 },
        ].map((s, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className={`h-1.5 sm:h-2 rounded-full transition-all ${
              s.done ? 'bg-emerald-500' : s.active ? 'bg-amber-400 animate-pulse' : 'bg-slate-800'
            }`} />
            <span className={`text-[10px] font-medium truncate text-center ${
              s.done ? 'text-emerald-400 font-bold' : s.active ? 'text-amber-300 font-bold' : 'text-slate-500'
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Step 0: Check Area */}
      {internalStep === 0 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between py-2 gap-2 overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-amber-400 tracking-wider">
                STEP 1: IS IT SAFE TO HELP?
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 leading-snug">
                Look Around Airport Concourse
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                A passenger suddenly fell near Gate 42. Before running over, check: Are there any moving baggage carts or wet floors?
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> No moving airport carts nearby
            </div>
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Floor is dry and clean to kneel on
            </div>
          </div>

          <button
            onClick={handleConfirmSceneSafety}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            Area is Safe — Go to the Person →
          </button>
        </div>
      )}

      {/* Step 1: Check if Awake */}
      {internalStep === 1 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between py-2 gap-2 overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-blue-500/20 text-blue-400 shrink-0">
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-blue-400 tracking-wider">
                STEP 2: ARE THEY AWAKE?
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 leading-snug">
                Tap Shoulders & Shout Loudly
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Kneel beside them. Tap both shoulders firmly and shout loudly:
                <strong className="text-amber-300 block text-xs sm:text-sm mt-0.5">"Hey, are you okay? Can you hear me?"</strong>
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-200">
            <span className="font-bold text-red-100 block text-xs">WHAT HAPPENED:</span>
            Eyes remain closed. No response at all. They are completely unconscious!
          </div>

          <button
            onClick={handleCheckResponse}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            Not Responding — Call For Help →
          </button>
        </div>
      )}

      {/* Step 2: Call 997 & AED */}
      {internalStep === 2 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between py-2 gap-2 overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-red-500/20 text-red-400 shrink-0">
              <PhoneCall className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-red-400 tracking-wider">
                STEP 3: CALL FOR EMERGENCY BACKUP
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 leading-snug">
                Shout for Ambulance & Defibrillator (AED)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Point at another coworker or bystander nearby:
                <strong className="text-amber-300 block text-xs sm:text-sm mt-0.5">
                  "Call Airport Emergency 997 right now, and bring the AED from the wall!"
                </strong>
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Emergency team is running over with the AED defibrillator!</span>
          </div>

          <button
            onClick={handleCallDispatch}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PhoneCall className="w-4 h-4 sm:w-5 sm:h-5" />
            Help is Called — Now Check Breathing →
          </button>
        </div>
      )}

      {/* Step 3: Check Breathing */}
      {internalStep === 3 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between py-2 gap-2 overflow-hidden">
          <div className="flex items-start gap-2.5">
            <div className="p-2 sm:p-3 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
              <HeartPulse className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <span className="text-[10px] sm:text-xs font-bold uppercase text-purple-400 tracking-wider">
                STEP 4: ARE THEY BREATHING NORMALLY?
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 leading-snug">
                Look at Their Chest for 10 Seconds
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 leading-relaxed">
                Watch the chest. Are they breathing in and out smoothly? Place fingers on neck to check pulse.
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-amber-950/50 border border-amber-700 text-xs text-amber-200 space-y-1">
            <span className="font-bold text-amber-100 text-xs block">WHAT YOU SEE:</span>
            <p>• Chest is <strong>NOT</strong> moving up and down normally.</p>
            <p>• Making <strong>occasional gasping or snoring sounds</strong>.</p>
            <p>• You feel <strong>NO heartbeat pulse</strong> in their neck.</p>
          </div>

          <button
            onClick={handleCheckPulseAndBreathing}
            className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
            Make the Big Decision →
          </button>
        </div>
      )}

      {/* Step 4: The Big Decision: Should you do CPR? */}
      {internalStep === 4 && (
        <div className="flex-1 min-h-0 flex flex-col justify-between py-1 gap-1.5 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                Should you start CPR on this person?
              </h3>
              <p className="text-[11px] text-slate-300 leading-tight">
                Unconscious, no pulse, making gasping noises. What do you do?
              </p>
            </div>
          </div>

          {/* Compact plain-English options */}
          <div className="grid grid-cols-1 gap-1.5 flex-1 min-h-0 justify-center flex flex-col">
            <button
              onClick={() => handleDecision('cpr_immediate')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                decisionSelected === 'cpr_immediate'
                  ? 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 hover:border-emerald-500 text-slate-200 active:scale-99'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 font-black text-xs">
                A
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-white block text-xs sm:text-sm leading-tight">
                  YES! Start CPR immediately!
                </span>
                <span className="text-[10px] text-slate-300 block truncate">
                  Gasping is cardiac arrest — need chest compressions right away!
                </span>
              </div>
            </button>

            <button
              onClick={() => handleDecision('recovery_position')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                decisionSelected === 'recovery_position'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-slate-950 border-slate-800 hover:border-red-500 text-slate-200 active:scale-99'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0 font-bold text-xs">
                B
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white block text-xs leading-tight">
                  NO — Roll them on side in recovery position
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Just wait without pressing on their chest.
                </span>
              </div>
            </button>

            <button
              onClick={() => handleDecision('wait_breathing')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                decisionSelected === 'wait_breathing'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-slate-950 border-slate-800 hover:border-red-500 text-slate-200 active:scale-99'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0 font-bold text-xs">
                C
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white block text-xs leading-tight">
                  NO — Wait to see if breathing gets better
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Wait 5 minutes to see if they wake up.
                </span>
              </div>
            </button>

            <button
              onClick={() => handleDecision('give_water')}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                decisionSelected === 'give_water'
                  ? 'bg-red-950/80 border-red-500 text-red-200'
                  : 'bg-slate-950 border-slate-800 hover:border-red-500 text-slate-200 active:scale-99'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 shrink-0 font-bold text-xs">
                D
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-white block text-xs leading-tight">
                  Try to give them a glass of water
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  Help them drink liquid to wake up.
                </span>
              </div>
            </button>
          </div>

          {/* Feedback banner */}
          {feedbackMessage && (
            <div className={`p-2 sm:p-2.5 rounded-xl border text-[11px] leading-tight flex items-center gap-2 animate-fade-in shrink-0 ${
              feedbackMessage.isError 
                ? 'bg-red-950 border-red-500 text-red-100' 
                : 'bg-emerald-950 border-emerald-500 text-emerald-100 font-semibold'
            }`}>
              {feedbackMessage.isError ? (
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="truncate">{feedbackMessage.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
