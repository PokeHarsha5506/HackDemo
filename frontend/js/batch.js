/**
 * batch.js — CSV Batch prediction screen component.
 * Allows uploading CSV files and displays a ranked table of student dropout risk scores.
 */

import { predictBatch } from './api.js';
import { mockBatchPredictResponse } from './mock.js';
import { getState, setState } from './state.js';

export function initBatchScreen(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">📁 Batch Student Risk Analysis</h2>
        <span class="card-subtitle">Upload CSV file for batch predictions</span>
      </div>

      <div class="batch-dropzone" id="batch-dropzone">
        <div style="font-size: 2.5rem; margin-bottom: var(--s2);">📄</div>
        <h3 style="margin-bottom: var(--s1);">Drag & Drop your CSV file here</h3>
        <p style="margin-bottom: var(--s4);">or click to browse from your computer</p>
        <button class="btn btn-secondary btn-pill" id="batch-browse-btn">
          Select CSV File
        </button>
        <input type="file" id="batch-file-input" accept=".csv" style="display: none;" />
      </div>

      <div id="batch-status-area" style="margin-top: var(--s4);"></div>
      <div id="batch-table-container"></div>
    </div>
  `;

  const dropzone = container.querySelector('#batch-dropzone');
  const fileInput = container.querySelector('#batch-file-input');
  const browseBtn = container.querySelector('#batch-browse-btn');
  const statusArea = container.querySelector('#batch-status-area');
  const tableContainer = container.querySelector('#batch-table-container');

  if (browseBtn && fileInput) {
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleCsvFile(e.target.files[0], statusArea, tableContainer);
      }
    });
  }

  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleCsvFile(files[0], statusArea, tableContainer);
      }
    });
  }
}

async function handleCsvFile(file, statusArea, tableContainer) {
  if (!file.name.endsWith('.csv')) {
    statusArea.innerHTML = `
      <div class="error-banner">
        ⚠️ Please upload a valid CSV (.csv) file.
      </div>
    `;
    return;
  }

  statusArea.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Processing CSV and scoring batch predictions...</p>
    </div>
  `;
  tableContainer.innerHTML = '';

  const { mockMode } = getState();

  try {
    let resultData;
    if (mockMode) {
      // Simulate 400ms network latency
      await new Promise(r => setTimeout(r, 400));
      resultData = mockBatchPredictResponse(file);
    } else {
      resultData = await predictBatch(file);
    }

    statusArea.innerHTML = '';
    renderBatchTable(tableContainer, resultData.results || []);
  } catch (err) {
    statusArea.innerHTML = `
      <div class="error-banner">
        ⚠️ ${err.message || 'Batch prediction failed. Try enabling Mock Mode.'}
      </div>
    `;
  }
}

function renderBatchTable(container, results) {
  if (!results || results.length === 0) {
    container.innerHTML = `<p class="text-center" style="padding:var(--s4);">No student records found in CSV.</p>`;
    return;
  }

  // Sort by highest risk score first
  const sorted = [...results].sort((a, b) => b.risk_score - a.risk_score);

  const rowsHtml = sorted.map(row => {
    const scorePct = Math.round(row.risk_score * 100);
    return `
      <tr>
        <td class="tabular-nums" style="font-weight:600;">${row.student_id}</td>
        <td>
          <span class="tabular-nums" style="font-weight:700; font-size:1.05rem;">
            ${scorePct}%
          </span>
        </td>
        <td>
          <span class="badge badge-${row.risk_band}">${row.risk_band} risk</span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="margin-top: var(--s4);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--s3);">
        <h3>Batch Results (${sorted.length} Students)</h3>
        <span class="card-subtitle">Ranked by Highest Dropout Risk</span>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Risk Score</th>
              <th>Risk Band</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
