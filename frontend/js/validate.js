/**
 * validate.js — Client-side input validation module.
 * Evaluates field constraints (required, type, min, max) without risk score logic.
 * Triggers on blur or on form submit.
 */

export function validateSingleField(feature, value) {
  if (!feature) return null;

  const { label, type, required, min, max } = feature;

  // 1. Required Check
  if (required && (value === null || value === undefined || value === '')) {
    return `${label} is required.`;
  }

  // If value is empty and optional, it's valid
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // 2. Type & Bounds Check
  if (type === 'number') {
    const num = Number(value);
    if (isNaN(num)) {
      return `${label} must be a valid number.`;
    }
    if (min !== undefined && num < min) {
      return `${label} cannot be less than ${min}.`;
    }
    if (max !== undefined && num > max) {
      return `${label} cannot exceed ${max}.`;
    }
  }

  return null; // Valid
}

export function validateAllFields(schemaFeatures, formData) {
  const errors = {};
  let isValid = true;

  if (!schemaFeatures || !Array.isArray(schemaFeatures)) {
    return { isValid: true, errors: {} };
  }

  schemaFeatures.forEach(feature => {
    const val = formData[feature.name];
    const errorMsg = validateSingleField(feature, val);
    if (errorMsg) {
      errors[feature.name] = errorMsg;
      isValid = false;
    }
  });

  return { isValid, errors };
}
