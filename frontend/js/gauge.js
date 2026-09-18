/**
 * gauge.js — Animated SVG Risk Gauge arc component.
 * Receives riskScore (0-1 float) and riskBand ("low"|"medium"|"high").
 * Uses tabular-nums monospace font for digits to prevent UI jitter.
 */

const ARC_LENGTH = 251.327; // PI * Radius 80

export function renderGauge(container, riskScore = 0, riskBand = 'low', confidenceLow = null, confidenceHigh = null) {
  if (!container) return;

  const scorePct = Math.round(riskScore * 100);
  const targetOffset = ARC_LENGTH * (1 - Math.max(0, Math.min(1, riskScore)));

  // Color according to band CSS custom properties
  let colorVar = 'var(--risk-low-gauge)';
  if (riskBand === 'medium') colorVar = 'var(--risk-medium-gauge)';
  if (riskBand === 'high') colorVar = 'var(--risk-high-gauge)';

  const ciHtml = (confidenceLow !== null && confidenceHigh !== null)
    ? `<div class="confidence-interval" title="95% Confidence Interval">
        CI: <span class="tabular-nums">${Math.round(confidenceLow * 100)}%</span> – <span class="tabular-nums">${Math.round(confidenceHigh * 100)}%</span>
       </div>`
    : '';

  container.innerHTML = `
    <div class="gauge-container" role="region" aria-label="Dropout Risk Score Gauge">
      <svg class="gauge-svg" viewBox="0 0 220 130">
        <!-- Background Track Arc -->
        <path
          class="gauge-bg"
          d="M 30 110 A 80 80 0 0 1 190 110"
        />
        <!-- Animated Risk Fill Arc -->
        <path
          class="gauge-arc"
          id="gauge-arc-fill"
          d="M 30 110 A 80 80 0 0 1 190 110"
          stroke="${colorVar}"
          stroke-dasharray="${ARC_LENGTH}"
          stroke-dashoffset="${ARC_LENGTH}"
        />
      </svg>
      <div class="gauge-score-display">
        <span class="gauge-number tabular-nums" id="gauge-number-val">0</span><span class="gauge-number-unit">%</span>
        <span class="badge badge-${riskBand}">${riskBand} Risk</span>
        ${ciHtml}
      </div>
    </div>
  `;

  // Animate arc fill and number count-up smoothly
  requestAnimationFrame(() => {
    const arcFill = container.querySelector('#gauge-arc-fill');
    if (arcFill) {
      arcFill.style.strokeDashoffset = targetOffset.toString();
    }

    // Number count-up animation
    const numDisplay = container.querySelector('#gauge-number-val');
    if (!numDisplay) return;

    let start = 0;
    const duration = 600; // ms
    const startTime = performance.now();

    function step(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const current = Math.round((1 - Math.pow(1 - progress, 3)) * scorePct);
      numDisplay.textContent = current.toString();

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        numDisplay.textContent = scorePct.toString();
      }
    }

    requestAnimationFrame(step);
  });
}
