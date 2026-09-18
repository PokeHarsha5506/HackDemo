/**
 * mock.js — Fake responses for offline development and fallback demonstration.
 * Complies strictly with the frozen API contract.
 */

export const mockSchema = {
  features: [
    { name: 'attendance_pct', label: 'Class Attendance Rate', type: 'number', min: 0, max: 100, step: 1, default: 82, unit: '%', help: 'Percentage of total lectures attended', required: true },
    { name: 'prev_grade', label: 'Previous Term GPA / Grade', type: 'number', min: 0, max: 100, step: 1, default: 68, unit: '%', help: 'Average percentage score from prior semester', required: true },
    { name: 'assignments_completed_pct', label: 'Assignment Completion', type: 'number', min: 0, max: 100, step: 1, default: 75, unit: '%', help: 'Share of coursework submitted on time', required: true },
    { name: 'study_hours_per_week', label: 'Study Hours per Week', type: 'number', min: 0, max: 60, step: 1, default: 12, unit: 'hrs', help: 'Estimated weekly self-study time outside class', required: true },
    { name: 'failures_prev_term', label: 'Previous Term Failures', type: 'number', min: 0, max: 10, step: 1, default: 1, help: 'Number of failed courses in preceding semester', required: true },
    { name: 'lms_logins_per_week', label: 'LMS Weekly Logins', type: 'number', min: 0, max: 100, step: 1, default: 14, unit: 'logins', help: 'Average weekly logins to learning portal', required: false },
    { name: 'age', label: 'Student Age', type: 'number', min: 16, max: 70, step: 1, default: 20, unit: 'yrs', help: 'Student age in years', required: false },
    { name: 'scholarship', label: 'Has Financial Scholarship', type: 'boolean', default: false, help: 'Receives merit or financial aid scholarship', required: false },
    { name: 'tuition_up_to_date', label: 'Tuition Up to Date', type: 'boolean', default: true, help: 'All tuition fees are paid up to date', required: false }
  ]
};

export function mockPredictResponse(data) {
  const attendance = Number(data.attendance_pct ?? 82);
  const grade = Number(data.prev_grade ?? 68);
  const assignments = Number(data.assignments_completed_pct ?? 75);
  const studyHours = Number(data.study_hours_per_week ?? 12);
  const failures = Number(data.failures_prev_term ?? 1);

  // Compute a mock risk calculation based on inputs
  let score = 0.5 - (attendance * 0.003) - (grade * 0.002) - (assignments * 0.002) - (studyHours * 0.01) + (failures * 0.12);
  if (data.tuition_up_to_date === false) score += 0.1;
  if (data.scholarship === true) score -= 0.05;

  // Clamp score between 0.04 and 0.96
  score = Math.max(0.04, Math.min(0.96, score));
  score = Math.round(score * 100) / 100;

  let band = 'low';
  if (score >= 0.60) {
    band = 'high';
  } else if (score >= 0.30) {
    band = 'medium';
  }

  const ciLow = Math.max(0.01, Math.round((score - 0.06) * 100) / 100);
  const ciHigh = Math.min(0.99, Math.round((score + 0.06) * 100) / 100);

  // Generate top 3 factor items sorted by absolute contribution
  const factors = [
    {
      feature: 'attendance_pct',
      label: 'Class Attendance Rate',
      value: `${attendance}%`,
      contribution: attendance < 75 ? 0.22 : -0.18,
      direction: attendance < 75 ? 'increase' : 'decrease',
      explanation: attendance < 75
        ? 'Low lecture attendance significantly raises academic dropout probability.'
        : 'Consistent class attendance builds a strong foundation for course retention.'
    },
    {
      feature: 'failures_prev_term',
      label: 'Previous Term Failures',
      value: `${failures} failure${failures === 1 ? '' : 's'}`,
      contribution: failures > 0 ? 0.19 : -0.11,
      direction: failures > 0 ? 'increase' : 'decrease',
      explanation: failures > 0
        ? 'Prior course failures indicate underlying academic risk factors.'
        : 'Clean academic record without prior course failures reduces dropout risk.'
    },
    {
      feature: 'assignments_completed_pct',
      label: 'Assignment Completion',
      value: `${assignments}%`,
      contribution: assignments < 70 ? 0.15 : -0.14,
      direction: assignments < 70 ? 'increase' : 'decrease',
      explanation: assignments < 70
        ? 'Missing assignments correlates with declining subject mastery.'
        : 'Regular assignment completion maintains study momentum.'
    }
  ];

  // Calculate mock exam forecast
  let forecastPoint = Math.round((grade * 0.6) + (attendance * 0.25) + (studyHours * 0.8) - (failures * 4));
  forecastPoint = Math.max(35, Math.min(98, forecastPoint));

  const exam_forecast = (data.hide_forecast === true) ? null : {
    point: forecastPoint,
    low: Math.max(30, forecastPoint - 7),
    high: Math.min(100, forecastPoint + 6)
  };

  let recommendation;
  if (band === 'high') {
    recommendation = {
      headline: 'Immediate Intervention & Study Contract Recommended',
      detail: 'Set up an urgent meeting with the academic advisor. Assign a peer tutor for core subjects and establish mandatory weekly check-ins.',
      priority_rank: 1
    };
  } else if (band === 'medium') {
    recommendation = {
      headline: 'Targeted Support & Progress Monitoring',
      detail: 'Encourage participation in weekly study labs, review missed coursework, and send automated assignment reminders.',
      priority_rank: 2
    };
  } else {
    recommendation = {
      headline: 'Positive Reinforcement & Advanced Enrichment',
      detail: 'Student is performing well. Maintain current study routine and suggest optional honors workshops or student mentoring opportunities.',
      priority_rank: 3
    };
  }

  return {
    risk_score: score,
    risk_band: band,
    confidence_low: ciLow,
    confidence_high: ciHigh,
    top_factors: factors,
    exam_forecast,
    recommendation,
    model_version: 'v1.4.2-edtech-ensemble (mock)',
    computed_at: new Date().toISOString()
  };
}

export function mockBatchPredictResponse(fileData) {
  return {
    results: [
      { student_id: 'STU-1042', risk_score: 0.82, risk_band: 'high' },
      { student_id: 'STU-1089', risk_score: 0.68, risk_band: 'high' },
      { student_id: 'STU-1015', risk_score: 0.44, risk_band: 'medium' },
      { student_id: 'STU-1092', risk_score: 0.38, risk_band: 'medium' },
      { student_id: 'STU-1004', risk_score: 0.12, risk_band: 'low' },
      { student_id: 'STU-1056', risk_score: 0.08, risk_band: 'low' }
    ]
  };
}
