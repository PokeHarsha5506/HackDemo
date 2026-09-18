/**
 * main.js — Application entry point / bootstrapper.
 * Wires events, handles screen switching, subscribes to state store, and manages mock mode.
 */

import { getState, setState, updateFormField, setFieldError, clearFieldErrors } from './state.js';
import { getHealth, getSchema, predict } from './api.js';
import { mockSchema, mockPredictResponse } from './mock.js';
import { renderForm, readFormValues, setFieldValue } from './form.js';
import { validateSingleField, validateAllFields } from './validate.js';
import { renderResult } from './render.js';
import { renderScenarioSlider } from './slider.js';
import { initBatchScreen } from './batch.js';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  // DOM element references
  const mockBanner = document.querySelector('#mock-banner');
  const mockToggleBtn = document.querySelector('#mock-toggle-btn');
  const mockStatusText = document.querySelector('#mock-status-text');
  const navPredictBtn = document.querySelector('#nav-predict');
  const navBatchBtn = document.querySelector('#nav-batch');
  const screenPredict = document.querySelector('#screen-predict');
  const screenBatch = document.querySelector('#screen-batch');
  const formContainer = document.querySelector('#form-container');
  const studentForm = document.querySelector('#student-form');
  const resultContainer = document.querySelector('#result-container');
  const formStatusArea = document.querySelector('#form-status-area');
  const submitBtn = document.querySelector('#submit-btn');

  // 1. Navigation Screen Toggles
  if (navPredictBtn && navBatchBtn) {
    navPredictBtn.addEventListener('click', () => {
      navPredictBtn.classList.add('active');
      navBatchBtn.classList.remove('active');
      screenPredict.classList.add('active-screen');
      screenBatch.classList.remove('active-screen');
      setState({ activeScreen: 'predict' });
    });

    navBatchBtn.addEventListener('click', () => {
      navBatchBtn.classList.add('active');
      navPredictBtn.classList.remove('active');
      screenBatch.classList.add('active-screen');
      screenPredict.classList.remove('active-screen');
      setState({ activeScreen: 'batch' });
      initBatchScreen(screenBatch);
    });
  }

  // 2. Mock Mode Toggle Handler
  if (mockToggleBtn) {
    mockToggleBtn.addEventListener('click', () => {
      const current = getState().mockMode;
      const nextMode = !current;
      setState({ mockMode: nextMode });
      loadSchemaAndInitialPrediction();
    });
  }

  // 3. Form Input Blur & Input Validation Listeners
  if (formContainer) {
    formContainer.addEventListener('focusout', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        const name = e.target.name;
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        const { schema } = getState();
        if (schema) {
          const feature = schema.find(f => f.name === name);
          const errorMsg = validateSingleField(feature, val);
          if (errorMsg) {
            setFieldError(name, errorMsg);
          } else {
            const currentErrors = { ...getState().fieldErrors };
            delete currentErrors[name];
            setState({ fieldErrors: currentErrors });
          }
        }
      }
    });

    formContainer.addEventListener('input', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        const name = e.target.name;
        const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        updateFormField(name, val);
      }
    });
  }

  // 4. Form Submit Handler (No Page Reload)
  if (studentForm) {
    studentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const { schema } = getState();
      if (!schema) return;

      const formData = readFormValues(formContainer);
      const validation = validateAllFields(schema, formData);

      if (!validation.isValid) {
        setState({ fieldErrors: validation.errors });
        // Focus first invalid field
        const firstInvalid = formContainer.querySelector('.field-group.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      clearFieldErrors();
      await executePrediction(formData);
    });
  }

  // 5. Initial Backend Health Check & Schema Loading
  await checkHealthAndLoadSchema();
}

async function checkHealthAndLoadSchema() {
  let isOffline = false;
  try {
    const health = await getHealth();
    setState({ apiHealth: { connected: true, model_loaded: health.model_loaded } });
  } catch (err) {
    isOffline = true;
    setState({
      apiHealth: { connected: false, model_loaded: false },
      mockMode: true // Auto fallback to mock mode if server offline
    });
  }

  await loadSchemaAndInitialPrediction();
}

async function loadSchemaAndInitialPrediction() {
  const formContainer = document.querySelector('#form-container');
  const mockBanner = document.querySelector('#mock-banner');
  const mockStatusText = document.querySelector('#mock-status-text');
  const { mockMode } = getState();

  // Update Mock Banner display
  if (mockBanner) {
    if (mockMode) {
      mockBanner.classList.remove('hidden');
    } else {
      mockBanner.classList.add('hidden');
    }
  }

  if (mockStatusText) {
    mockStatusText.textContent = mockMode ? 'Mock Mode (Active)' : 'Live API Mode';
  }

  setState({ isLoadingSchema: true });
  if (formContainer) {
    formContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading feature schema...</p>
      </div>
    `;
  }

  try {
    let schemaData;
    if (mockMode) {
      schemaData = mockSchema;
    } else {
      schemaData = await getSchema();
    }

    const features = schemaData.features || [];
    const initialFormData = {};
    features.forEach(f => {
      initialFormData[f.name] = f.default !== undefined ? f.default : '';
    });

    setState({
      schema: features,
      formData: initialFormData,
      isLoadingSchema: false,
      serverError: null
    });

    renderForm(formContainer, features, initialFormData, {});
    // Initial prediction run
    await executePrediction(initialFormData);

  } catch (err) {
    setState({
      isLoadingSchema: false,
      serverError: err.message || 'Failed to load feature schema.'
    });

    if (formContainer) {
      formContainer.innerHTML = `
        <div class="error-banner">
          ⚠️ ${err.message || 'Server connection failed.'}
          <button class="btn btn-secondary btn-pill" id="fallback-mock-btn" style="margin-left:auto;">
            Switch to Mock Mode
          </button>
        </div>
      `;
      const fallbackBtn = formContainer.querySelector('#fallback-mock-btn');
      if (fallbackBtn) {
        fallbackBtn.addEventListener('click', () => {
          setState({ mockMode: true });
          loadSchemaAndInitialPrediction();
        });
      }
    }
  }
}

async function executePrediction(formData) {
  const resultContainer = document.querySelector('#result-container');
  const submitBtn = document.querySelector('#submit-btn');
  const { mockMode, schema } = getState();

  setState({ isScoring: true, serverError: null });

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner" style="width:18px; height:18px; border-width:2px;"></span> Scoring...`;
  }

  try {
    let result;
    if (mockMode) {
      await new Promise(r => setTimeout(r, 200)); // Brief realistic delay
      result = mockPredictResponse(formData);
    } else {
      result = await predict(formData);
    }

    setState({ prediction: result, isScoring: false });
    renderResult(resultContainer, result);

    // Mount live Scenario Slider inside result screen
    const sliderMount = resultContainer.querySelector('#scenario-slider-mount');
    if (sliderMount && schema) {
      renderScenarioSlider(sliderMount, schema, formData, async (updatedData, signal, seqId, isValidSeq) => {
        // Live scenario rescore callback
        try {
          let liveRes;
          if (mockMode) {
            liveRes = mockPredictResponse(updatedData);
          } else {
            liveRes = await predict(updatedData, signal);
          }

          if (isValidSeq(seqId)) {
            setState({ prediction: liveRes });
            renderResult(resultContainer, liveRes);

            // Re-mount slider to retain state
            const newMount = resultContainer.querySelector('#scenario-slider-mount');
            if (newMount) {
              renderScenarioSlider(newMount, schema, updatedData, this);
            }

            // Update form fields to reflect slider changes
            Object.keys(updatedData).forEach(k => {
              setFieldValue(document.querySelector('#form-container'), k, updatedData[k]);
            });
          }
        } catch (e) {
          if (e.name !== 'AbortError') {
            console.error('Scenario rescore error:', e);
          }
        }
      });
    }

  } catch (err) {
    setState({ isScoring: false, serverError: err.message });
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="card error-state">
          <div class="state-icon">⚠️</div>
          <h3>Prediction Request Failed</h3>
          <p>${err.message}</p>
          <button class="btn btn-secondary btn-pill" id="retry-pred-btn">
            Retry Prediction
          </button>
        </div>
      `;
      const retryBtn = resultContainer.querySelector('#retry-pred-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => executePrediction(formData));
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `📊 Assess Dropout Risk`;
    }
  }
}
