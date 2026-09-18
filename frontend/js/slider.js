/**
 * slider.js — Interactive Scenario Slider component.
 * Features:
 * - 120ms debounce on range input
 * - AbortController to cancel stale HTTP requests during dragging
 * - Sequence numbering (seqId) to drop out-of-order async responses
 */

let debounceTimer = null;
let activeAbortController = null;
let currentSeqId = 0;

export function renderScenarioSlider(container, schemaFeatures, currentFormData, onRescore) {
  if (!container || !schemaFeatures || !schemaFeatures.length) return;

  // Find adjustable numeric features (e.g. attendance_pct, prev_grade, study_hours_per_week)
  const numericFeatures = schemaFeatures.filter(f => f.type === 'number');
  if (numericFeatures.length === 0) return;

  // Default to attendance_pct or first numeric feature
  const selectedFeatureName = container.dataset.activeFeature || numericFeatures[0].name;
  const activeFeature = numericFeatures.find(f => f.name === selectedFeatureName) || numericFeatures[0];

  const min = activeFeature.min !== undefined ? activeFeature.min : 0;
  const max = activeFeature.max !== undefined ? activeFeature.max : 100;
  const step = activeFeature.step !== undefined ? activeFeature.step : 1;
  const unit = activeFeature.unit ? ` ${activeFeature.unit}` : '';
  const currentVal = currentFormData[activeFeature.name] !== undefined
    ? currentFormData[activeFeature.name]
    : (activeFeature.default ?? min);

  // Build feature select options
  const featureOptions = numericFeatures.map(f => `
    <option value="${f.name}" ${f.name === activeFeature.name ? 'selected' : ''}>
      ${f.label}
    </option>
  `).join('');

  container.innerHTML = `
    <div class="scenario-panel">
      <div class="slider-header">
        <label for="scenario-feature-select" class="field-label" style="margin:0;">
          ⚡ Live Scenario Simulation
        </label>
        <select id="scenario-feature-select" class="field-select" style="width:auto; padding:4px 8px; font-size:0.85rem;">
          ${featureOptions}
        </select>
      </div>

      <div class="slider-container">
        <div style="display:flex; justify-content:space-between; font-size:0.875rem; font-weight:600;">
          <span>${activeFeature.label}:</span>
          <span class="tabular-nums" id="slider-val-display" style="color:var(--accent); font-weight:700;">
            ${currentVal}${unit}
          </span>
        </div>
        <input
          type="range"
          id="scenario-range-input"
          class="range-input"
          min="${min}"
          max="${max}"
          step="${step}"
          value="${currentVal}"
          aria-label="Adjust ${activeFeature.label} for scenario simulation"
        />
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--ink-muted);">
          <span>${min}${unit}</span>
          <span>${max}${unit}</span>
        </div>
      </div>
    </div>
  `;

  // Attach event listeners
  const selectElem = container.querySelector('#scenario-feature-select');
  const rangeElem = container.querySelector('#scenario-range-input');
  const valDisplay = container.querySelector('#slider-val-display');

  if (selectElem) {
    selectElem.addEventListener('change', (e) => {
      container.dataset.activeFeature = e.target.value;
      renderScenarioSlider(container, schemaFeatures, currentFormData, onRescore);
    });
  }

  if (rangeElem && valDisplay) {
    rangeElem.addEventListener('input', (e) => {
      const newVal = Number(e.target.value);
      valDisplay.textContent = `${newVal}${unit}`;

      // 1. Debounce live API rescore by ~120ms
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        // 2. Abort stale in-flight request if present
        if (activeAbortController) {
          activeAbortController.abort();
        }
        activeAbortController = new AbortController();

        // 3. Increment sequence ID
        currentSeqId += 1;
        const thisSeqId = currentSeqId;

        const updatedData = {
          ...currentFormData,
          [activeFeature.name]: newVal
        };

        // Invoke callback passing updated form data, abort signal, and sequence ID
        onRescore(updatedData, activeAbortController.signal, thisSeqId, (resSeqId) => {
          // Verify sequence ID matching
          return resSeqId === currentSeqId;
        });
      }, 120);
    });
  }
}
