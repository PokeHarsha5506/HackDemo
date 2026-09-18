/**
 * render.js — Paints the result dashboard from API prediction response object.
 * Pure formatting and DOM rendering — NO score derivation or logic.
 */

import { renderGauge } from './gauge.js';

export function renderResult(container, prediction) {
  if (!container) return;

  if (!prediction) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="state-icon">📊</div>
        <h3>No Prediction Generated Yet</h3>
        <p>Fill out the student details form on the left and submit to view instant dropout risk insights.</p>
      </div>
    `;
    return;
  }

  const {
    risk_score,
    risk_band,
    confidence_low,
    confidence_high,
    top_factors = [],
    exam_forecast,
    recommendation,
    model_version,
    computed_at
  } = prediction;

  // Build Top 3 Factors HTML
  let factorsHtml = '';
  if (top_factors && top_factors.length > 0) {
    const factorItems = top_factors.slice(0, 3).map(item => {
      const isIncrease = item.direction === 'increase';
      const absContrib = Math.min(100, Math.round(Math.abs(item.contribution) * 100));
      const badgeText = isIncrease ? `+${absContrib}% Risk` : `-${absContrib}% Risk`;

      return `
        <div class="factor-item">
          <div class="factor-header">
            <span class="factor-name">${item.label} (${item.value})</span>
            <span class="factor-impact-badge ${isIncrease ? 'increase' : 'decrease'}">
              ${badgeText}
            </span>
          </div>
          <div class="factor-bar-track" aria-hidden="true">
            <div
              class="factor-bar-fill ${isIncrease ? 'increase' : 'decrease'}"
              style="width: ${absContrib}%;"
            ></div>
          </div>
          <p class="factor-explanation">${item.explanation}</p>
        </div>
      `;
    }).join('');

    factorsHtml = `
      <div class="card margin-top">
        <div class="card-header">
          <h3 class="card-title">🔍 Top Impact Factors</h3>
          <span class="card-subtitle">Key drivers influencing risk</span>
        </div>
        <div class="factors-list">
          ${factorItems}
        </div>
      </div>
    `;
  }

  // Build Exam Forecast HTML (Hide gracefully if null)
  let forecastHtml = '';
  if (exam_forecast) {
    forecastHtml = `
      <div class="card forecast-card margin-top">
        <div class="card-header">
          <h3 class="card-title">🎯 Projected Exam Performance</h3>
          <span class="card-subtitle">Model forecast</span>
        </div>
        <div class="forecast-stats">
          <div>
            <div class="forecast-val tabular-nums">${exam_forecast.point}%</div>
            <div class="forecast-range">Expected Final Score</div>
          </div>
          <div>
            <div class="forecast-range tabular-nums">Range: ${exam_forecast.low}% – ${exam_forecast.high}%</div>
            <div class="forecast-range">90% Prediction Interval</div>
          </div>
        </div>
      </div>
    `;
  }

  // Build Recommendation Card HTML
  let recommendationHtml = '';
  if (recommendation) {
    recommendationHtml = `
      <div class="card action-card margin-top">
        <div class="action-priority">Priority Rank #${recommendation.priority_rank} Action</div>
        <h3 class="action-headline">${recommendation.headline}</h3>
        <p class="action-detail">${recommendation.detail}</p>
      </div>
    `;
  }

  // Formatted date string
  const timestampStr = computed_at
    ? new Date(computed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '';

  // Outer layout container
  container.innerHTML = `
    <div class="results-wrapper" role="region" aria-live="polite" aria-label="Student Risk Assessment Results">
      <!-- 1. Risk Gauge Card -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🛡️ Dropout Risk Assessment</h3>
          <span class="card-subtitle">Live ML Prediction</span>
        </div>
        <div id="gauge-mount"></div>
      </div>

      <!-- 2. Top Factors -->
      ${factorsHtml}

      <!-- 3. Scenario Slider Mount Point -->
      <div id="scenario-slider-mount"></div>

      <!-- 4. Exam Forecast (if available) -->
      ${forecastHtml}

      <!-- 5. Recommended Action Card -->
      ${recommendationHtml}

      <!-- Footer Metadata -->
      <div class="metadata-footer margin-top text-center" style="font-size:0.75rem; color:var(--ink-light); margin-top:var(--s4);">
        <span>Model Version: ${model_version || 'v1.0.0'}</span>
        ${timestampStr ? ` • <span>Computed at ${timestampStr}</span>` : ''}
      </div>
    </div>
  `;

  // Mount Gauge Arc
  const gaugeMount = container.querySelector('#gauge-mount');
  if (gaugeMount) {
    renderGauge(gaugeMount, risk_score, risk_band, confidence_low, confidence_high);
  }
}
