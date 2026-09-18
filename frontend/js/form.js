/**
 * form.js — Dynamically renders input fields from API schema.
 * Reads/writes form field values and attaches accessible ARIA attributes.
 */

export function renderForm(container, schemaFeatures, formData = {}, fieldErrors = {}) {
  if (!container) return;
  if (!schemaFeatures || !schemaFeatures.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No feature schema available.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  const formGrid = document.createElement('div');
  formGrid.className = 'form-grid';

  schemaFeatures.forEach(feature => {
    const { name, label, type, min, max, step, default: defVal, unit, help, required } = feature;
    const value = formData[name] !== undefined ? formData[name] : (defVal ?? '');
    const hasError = Boolean(fieldErrors[name]);
    const errorMsg = fieldErrors[name] || '';

    const fieldGroup = document.createElement('div');
    fieldGroup.className = `field-group ${hasError ? 'invalid' : ''}`;
    fieldGroup.dataset.feature = name;

    const labelId = `label-${name}`;
    const inputId = `input-${name}`;
    const helpId = `help-${name}`;
    const errorId = `error-${name}`;

    // Describedby IDs
    const describedBy = [help ? helpId : null, hasError ? errorId : null].filter(Boolean).join(' ');

    if (type === 'boolean') {
      fieldGroup.innerHTML = `
        <label for="${inputId}" class="toggle-field">
          <div>
            <span class="field-label" id="${labelId}">
              ${label} ${required ? '<span class="required-star" aria-hidden="true">*</span>' : ''}
            </span>
            ${help ? `<span class="field-help" id="${helpId}">${help}</span>` : ''}
          </div>
          <input
            type="checkbox"
            id="${inputId}"
            name="${name}"
            ${value ? 'checked' : ''}
            aria-invalid="${hasError}"
            ${describedBy ? `aria-describedby="${describedBy}"` : ''}
          />
        </label>
        <span class="field-error" id="${errorId}" role="alert">
          <span class="error-icon">⚠️</span> ${errorMsg}
        </span>
      `;
    } else {
      const isNumber = type === 'number';
      fieldGroup.innerHTML = `
        <label for="${inputId}" class="field-label" id="${labelId}">
          ${label} ${required ? '<span class="required-star" title="Required field">*</span>' : ''}
        </label>
        <div class="field-input-wrapper">
          <input
            type="${isNumber ? 'number' : 'text'}"
            id="${inputId}"
            name="${name}"
            class="field-input ${unit ? 'has-unit' : ''}"
            value="${value}"
            ${isNumber && min !== undefined ? `min="${min}"` : ''}
            ${isNumber && max !== undefined ? `max="${max}"` : ''}
            ${isNumber && step !== undefined ? `step="${step}"` : ''}
            ${required ? 'required' : ''}
            aria-invalid="${hasError}"
            ${describedBy ? `aria-describedby="${describedBy}"` : ''}
          />
          ${unit ? `<span class="field-unit" aria-hidden="true">${unit}</span>` : ''}
        </div>
        ${help ? `<span class="field-help" id="${helpId}">${help}</span>` : ''}
        <span class="field-error" id="${errorId}" role="alert">
          <span class="error-icon">⚠️</span> ${errorMsg}
        </span>
      `;
    }

    formGrid.appendChild(fieldGroup);
  });

  container.appendChild(formGrid);
}

export function readFormValues(container) {
  if (!container) return {};
  const values = {};
  const inputs = container.querySelectorAll('input, select');
  
  inputs.forEach(input => {
    const name = input.name;
    if (!name) return;
    
    if (input.type === 'checkbox') {
      values[name] = input.checked;
    } else if (input.type === 'number') {
      values[name] = input.value === '' ? null : Number(input.value);
    } else {
      values[name] = input.value;
    }
  });

  return values;
}

export function setFieldValue(container, fieldName, value) {
  if (!container) return;
  const input = container.querySelector(`[name="${fieldName}"]`);
  if (!input) return;

  if (input.type === 'checkbox') {
    input.checked = Boolean(value);
  } else {
    input.value = value;
  }
}
