/**
 * api.js — The ONLY file that knows the API base URL and endpoints.
 * Handles fetch requests, error parsing, signal cancellation, and ApiError wrapping.
 */

const BASE_URL = 'http://127.0.0.1:8000';

export class ApiError extends Error {
  constructor(message, code = 'SERVER_ERROR', field = null, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.field = field;
    this.status = status;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!res.ok) {
      let errPayload;
      try {
        errPayload = await res.json();
      } catch (e) {
        errPayload = null;
      }

      if (errPayload && errPayload.error) {
        throw new ApiError(
          errPayload.error.message || 'API request failed',
          errPayload.error.code || 'API_ERROR',
          errPayload.error.field || null,
          res.status
        );
      }
      throw new ApiError(`HTTP Error ${res.status}: ${res.statusText}`, 'HTTP_ERROR', null, res.status);
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw err; // Let caller handle abort
    }
    if (err instanceof ApiError) {
      throw err;
    }
    // Network failure or backend down
    throw new ApiError(
      'Unable to connect to prediction server. Please check your connection or switch to Mock Mode.',
      'NETWORK_ERROR',
      null,
      0
    );
  }
}

export async function getHealth() {
  return await request('/api/health');
}

export async function getSchema() {
  return await request('/api/schema');
}

export async function predict(bodyData, signal = null) {
  return await request('/api/predict', {
    method: 'POST',
    body: JSON.stringify(bodyData),
    signal
  });
}

export async function predictBatch(file) {
  const url = `${BASE_URL}/api/predict/batch`;
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      let errPayload;
      try { errPayload = await res.json(); } catch (e) {}
      throw new ApiError(
        errPayload?.error?.message || 'Batch prediction failed',
        errPayload?.error?.code || 'BATCH_ERROR',
        null,
        res.status
      );
    }

    return await res.json();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Batch CSV upload failed due to network error.', 'NETWORK_ERROR', null, 0);
  }
}
