/**
 * state.js — Single state object + subscribe/notify observer pattern.
 * Never calls fetch or API directly.
 */

let state = {
  activeScreen: 'predict',
  mockMode: false,
  apiHealth: { connected: false, model_loaded: false },
  schema: null,
  formData: {},
  fieldErrors: {},
  prediction: null,
  isLoadingSchema: false,
  isScoring: false,
  serverError: null,
  batchResults: null,
  batchLoading: false,
  scenarioField: 'attendance_pct' // Default slider feature
};

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setState(newState) {
  const prevState = { ...state };
  state = { ...state, ...newState };
  
  // Notify all subscribed listeners
  listeners.forEach(listener => listener(state, prevState));
}

export function updateFormField(fieldName, value) {
  const updatedForm = { ...state.formData, [fieldName]: value };
  
  // Clear error for field if modified
  const updatedErrors = { ...state.fieldErrors };
  delete updatedErrors[fieldName];

  setState({
    formData: updatedForm,
    fieldErrors: updatedErrors
  });
}

export function setFieldError(fieldName, errorMsg) {
  setState({
    fieldErrors: {
      ...state.fieldErrors,
      [fieldName]: errorMsg
    }
  });
}

export function clearFieldErrors() {
  setState({ fieldErrors: {} });
}
