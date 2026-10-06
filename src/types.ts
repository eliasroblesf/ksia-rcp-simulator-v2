/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SimulationStage = 
  | 'registration'
  | 'scene_assessment'
  | 'decision_to_cpr'
  | 'hand_placement'
  | 'cpr_compressions'
  | 'aed_dispatch_pads'
  | 'aed_analysis_shock'
  | 'cpr_post_shock'
  | 'debrief_report'
  | 'game_over';

export interface StudentInfo {
  name: string;
  employeeId: string;
  department: string;
  shift: 'Day Shift' | 'Night Shift' | 'Rotating Airside';
  badgeNumber: string;
  trainingDate: string;
  facility: string; // e.g., KSIA Terminal 1 Concourse B
}

export interface AssessmentStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  score: number;
  critical: boolean;
  timestamp?: string;
  userSelection?: string;
}

export interface HemodynamicState {
  systolicBp: number;      // mmHg (target: 80 - 110 mmHg during CPR)
  diastolicBp: number;     // mmHg (target: 35 - 55 mmHg)
  map: number;             // Mean Arterial Pressure (mmHg)
  perfusionIndex: number;  // 0 - 100%
  rhythmBpm: number;       // Compressions per minute (Richmond / rate)
  isAlive: boolean;
  criticalSecondsElapsed: number; // Seconds under 45 mmHg systolic (lethal if >= 4.0s)
  ecgState: 'vfib' | 'cpr_spike' | 'sinus' | 'asystole';
}

export interface CPRMetrics {
  totalCompressions: number;
  inTargetRateCount: number;      // 100 - 120 BPM
  adequateDepthCount: number;     // 50 - 60 mm
  adequateRecoilCount: number;    // 100% release
  handPlacementAccuracy: number;  // % accuracy to lower sternum
  pad1Accuracy: number;           // % accuracy to right infraclavicular
  pad2Accuracy: number;           // % accuracy to left midaxillary
  handsOffTimeSec: number;        // Interruptions in compressions
  totalDurationSec: number;
  chestCompressionFraction: number; // Target > 80%
  meanBloodPressure: number;
  peakBloodPressure: number;
  lowestBloodPressure: number;
  shocksDelivered: number;
  shockClearanceVerified: boolean;
  roscAchieved: boolean;
  earlyAedPenalty?: number;
  earlyAedSecondsShort?: number;
  earlyAedTriggered?: boolean;
}

export interface SimulationReport {
  id: string;
  student: StudentInfo;
  startedAt: string;
  completedAt: string;
  result: 'PASS' | 'FAIL';
  overallScore: number; // 0 - 100
  failureCause?: string;
  metrics: CPRMetrics;
  hemodynamicPeakMap: number;
  stepsCompleted: AssessmentStep[];
  evaluatorRemarks: string[];
  earlyAedPenalty?: number;
  earlyAedSecondsShort?: number;
  earlyAedTriggered?: boolean;
}
