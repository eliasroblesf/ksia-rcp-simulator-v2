/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Official King Salman International Airport (KSIA)
 * Cardiopulmonary Resuscitation (RCP/CPR) & AED Participation Report Generator
 * Clear, plain-English wording accessible for non-medical airport trainees
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SimulationReport } from '../types';
import { format } from 'date-fns';

export const generateRCPCertificatePDF = async (report: SimulationReport) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- Top Branding Bar ---
  doc.setFillColor(15, 42, 91);
  doc.rect(0, 0, pageWidth, 42, 'F');

  // Gold accent line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 42, pageWidth, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KING SALMAN INTERNATIONAL AIRPORT', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 230, 245);
  doc.text('AIRPORT FIRST AID & EMERGENCY RESPONSE TRAINING', 14, 26);
  doc.text('CPR (CHEST COMPRESSIONS) & DEFIBRILLATOR (AED) DRILL PARTICIPATION REPORT', 14, 32);

  // Document ID & Date
  doc.setFontSize(8);
  doc.text(`REPORT REF: KSIA-CPR-${report.id.substring(0, 8).toUpperCase()}`, pageWidth - 14, 18, { align: 'right' });
  doc.text(`DATE ISSUED: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`, pageWidth - 14, 26, { align: 'right' });
  doc.text('PARTICIPATION REPORT', pageWidth - 14, 34, { align: 'right' });

  let y = 54;

  // --- Participant Profile ---
  doc.setTextColor(20, 30, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. PARTICIPANT DETAILS', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Record Details', 'Item', 'Record Details']],
    body: [
      ['Participant Name', report.student.name || 'Participant', 'Employee Badge ID', report.student.employeeId || 'N/A'],
      ['Training Date', report.student.trainingDate || format(new Date(), 'yyyy-MM-dd'), 'Drill Score', `${report.overallScore}/100`],
      ['Location', 'Airport Concourse Gate 42', 'Result', report.result === 'PASS' ? 'COMPLETED · PARTICIPATED' : 'NEEDS PRACTICE']
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 248], textColor: [15, 42, 91], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 9, cellPadding: 2.8 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 57 },
      2: { fontStyle: 'bold', cellWidth: 38 },
      3: { cellWidth: 57, fontStyle: 'bold' }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // --- Outcome Banner ---
  const isPass = report.result === 'PASS';
  if (isPass) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(16, 185, 129);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(239, 68, 68);
  }
  doc.setLineWidth(1.2);
  doc.roundedRect(14, y, pageWidth - 28, 22, 3, 3, 'FD');

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  if (isPass) {
    doc.setTextColor(5, 150, 105);
    doc.text('STATUS: DRILL COMPLETED · PARTICIPATION RECORD', 20, y + 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(6, 95, 70);
    doc.text('Participant practiced recognizing emergency gasping, performing chest compressions, and AED defibrillator drill steps.', 20, y + 17);
  } else {
    doc.setTextColor(220, 38, 38);
    doc.text('STATUS: INCOMPLETE · PRACTICE NEEDED', 20, y + 10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(153, 27, 27);
    doc.text(`Note: ${report.failureCause || 'The blood pressure fell into the danger zone for too long. Pump continuously next drill.'}`, 20, y + 17);
  }

  y += 30;

  // --- Section 2: Step-by-Step Checklist Completed ---
  doc.setTextColor(20, 30, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. FIRST AID ACTION STEPS RECORD', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Step', 'What You Checked', 'Your Action', 'Result']],
    body: [
      ['1. Scene Safety', 'Checked for moving carts, spills, or dangers', 'Confirmed area is safe to approach', 'COMPLETED'],
      ['2. Check If Awake', 'Tapped shoulders and shouted out loud', 'Confirmed person is unresponsive', 'COMPLETED'],
      ['3. Call 997 & AED', 'Shouted for airport emergency backup & AED', 'Called 997 & summoned wall AED unit', 'COMPLETED'],
      ['4. Breathing Check', 'Checked chest movements and neck pulse', 'Recognized gasping as an emergency', 'COMPLETED'],
      ['5. The Big Decision', 'Decided whether to start chest compressions', 'Chose to start CPR immediately', 'CORRECT'],
      ['6. Hand Placement', 'Aimed for the lower center of the breastbone', `${Math.round(report.metrics.handPlacementAccuracy)}% accuracy on chest center`, report.metrics.handPlacementAccuracy >= 70 ? 'GOOD AIM' : 'OFF-CENTER'],
      ['7. Pumping Speed', 'Aim for 100 - 120 pumps per minute rhythm', `${Math.round((report.metrics.inTargetRateCount / Math.max(1, report.metrics.totalCompressions)) * 100)}% on target speed`, 'PASSED'],
      ['8. AED Sticky Pads', 'Stick pads on upper right chest & left ribs', `Pad 1: ${Math.round(report.metrics.pad1Accuracy)}% | Pad 2: ${Math.round(report.metrics.pad2Accuracy)}%`, 'CORRECT'],
      ['9. Safety Clearance', 'Made sure nobody was touching before shock', 'Confirmed all bystanders standing clear', 'SAFE'],
      ['10. Dummy Revival', 'Delivered post-shock chest pumps', 'Dummy successfully revived & breathing!', report.metrics.roscAchieved ? 'REVIVED!' : 'INCOMPLETE']
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 42, 91], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 62 },
      2: { cellWidth: 65 },
      3: { cellWidth: 23, halign: 'center', fontStyle: 'bold' }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // --- Section 3: Performance Numbers ---
  if (y > 215) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(20, 30, 50);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DRILL METRICS & PUMPING NUMBERS', 14, y);
  y += 6;

  const targetRatePct = Math.round((report.metrics.inTargetRateCount / Math.max(1, report.metrics.totalCompressions)) * 100);

    const metricsRows = [
      ['Total Chest Pumps Done', `${report.metrics.totalCompressions} pumps`, 'At least 50 pumps', 'Great effort'],
      ['Pumping Speed (100-120 BPM)', `${targetRatePct}% on speed`, 'Aim for 70%+ on beat', targetRatePct >= 70 ? 'On Rhythm!' : 'Needs practice'],
      ['Peak Blood Pressure Created', `${Math.round(report.metrics.peakBloodPressure)} mmHg`, 'Keep above 65 mmHg (Green)', report.metrics.peakBloodPressure >= 65 ? 'Good pressure' : 'Too low'],
      ['Lowest Blood Pressure Seen', `${Math.round(report.metrics.lowestBloodPressure)} mmHg`, 'Stay above 45 mmHg (Red line)', report.metrics.lowestBloodPressure >= 45 ? 'Safe' : 'Fell into red'],
      ['AED Electric Shocks Given', `${report.metrics.shocksDelivered} shock`, '1 shock as directed by voice', 'Safe delivery'],
      ['Dummy Revived (Life Saved)', report.metrics.roscAchieved ? 'YES! REVIVED' : 'NOT REVIVED', 'Revive the dummy to finish drill', report.metrics.roscAchieved ? 'Success' : 'Try again']
    ];

    if (report.metrics.earlyAedTriggered) {
      metricsRows.push([
        'Early AED Switch Penalty',
        `-${report.metrics.earlyAedPenalty || 0} pts`,
        'Full 2:00 min (10pt / 20s short)',
        `${report.metrics.earlyAedSecondsShort || 0}s short`
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [['Drill Metric', 'Your Score', 'Recommended Goal', 'Evaluation']],
      body: metricsRows,
    theme: 'grid',
    headStyles: { fillColor: [240, 243, 248], textColor: [15, 42, 91], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 55 },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 55 },
      3: { cellWidth: 30, halign: 'center' }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 12;

  // --- Sign-off ---
  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(20, 30, 50);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('4. SIGN-OFF & DRILL RECORD', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Name', 'Record', 'Date']],
    body: [
      ['KSIA First Aid Drill Lead', 'Capt. Salem Al-Otaibi', 'Airport HSE Lead [RECORDED]', format(new Date(), 'dd/MM/yyyy')],
      ['Participant', report.student.name || 'Participant', `Badge: ${report.student.employeeId || 'N/A'} [ACKNOWLEDGED]`, format(new Date(), 'dd/MM/yyyy')]
    ],
    theme: 'grid',
    headStyles: { fillColor: [15, 42, 91], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 3.5 }
  });

  // Footer on each page
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(140, 150, 165);
    doc.text(
      `KSIA FIRST AID & CPR DRILL PARTICIPATION REPORT | REF: ${report.id.substring(0, 8).toUpperCase()} | PAGE ${i} OF ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const cleanName = (report.student.name || 'PARTICIPANT').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`KSIA_CPR_PARTICIPATION_REPORT_${cleanName}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
};
