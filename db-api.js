/**
 * db-api.js — Frontend API client
 * Drop-in replacement for db.js when backend is running.
 * Change this one line to switch environments:
 */
const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:3000/api'
  : 'https://rm-backend-production-a701.up.railway.app/api';

// ── Helper: fetch wrapper with error handling ─────────────────────────────────
async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API error');
    return json;
  } catch (err) {
    console.error(`API Error [${url}]:`, err.message);
    throw err;
  }
}

const DB = {
  // ── Employees ───────────────────────────────────────────────────────────────
  employees: {
    getAll: async () => {
      const r = await apiFetch('/employees');
      return r.data;
    },
    getActive: async () => {
      const r = await apiFetch('/employees');
      return r.data.filter(e => e.active_status);
    },
    getById: async (id) => {
      const r = await apiFetch('/employees');
      return r.data.find(e => e.id === id) || null;
    },
    add: async (name, password = '1234') => {
      const r = await apiFetch('/employees', {
        method: 'POST',
        body: JSON.stringify({ employee_name: name, password }),
      });
      return r.data;
    },
    update: async (id, name) => {
      const r = await apiFetch(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ employee_name: name }),
      });
      return r.data;
    },
    toggleStatus: async (id) => {
      const r = await apiFetch(`/employees/${id}/status`, { method: 'PATCH' });
      return r.data;
    },
    setPassword: async (id, password) => {
      const r = await apiFetch(`/employees/${id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      });
      return r.data;
    },
    remove: async (id) => {
      await apiFetch(`/employees/${id}`, { method: 'DELETE' });
    },
    verify: async (id, password) => {
      try {
        const r = await apiFetch('/employees/verify', {
          method: 'POST',
          body: JSON.stringify({ id, password }),
        });
        return r.data;
      } catch { return null; }
    },
  },

  // ── Customers ───────────────────────────────────────────────────────────────
  customers: {
    getAll: async (filters = {}, page = 1) => {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filters.search)   params.set('search',   filters.search);
      if (filters.status && filters.status !== 'All') params.set('status', filters.status);
      if (filters.employee && filters.employee !== 'All') params.set('employee', filters.employee);
      if (filters.from)     params.set('from',     filters.from);
      if (filters.to)       params.set('to',       filters.to);
      const r = await apiFetch(`/customers?${params}`);
      return r; // { data, total, page, limit }
    },
    getStats: async () => {
      const r = await apiFetch('/customers/stats');
      return r.data;
    },
  },

  // ── Upload ──────────────────────────────────────────────────────────────────
  processUpload: async (file, uploadedBy) => {
    const form = new FormData();
    form.append('file', file);
    form.append('uploaded_by', uploadedBy);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Upload failed');
      return json.data; // { created, updated, failed, duplicatesInFile, warnings, total }
    } catch (err) {
      console.error('Upload error:', err.message);
      throw err;
    }
  },

  // ── Export ──────────────────────────────────────────────────────────────────
  exportToExcel: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.search)   params.set('search',   filters.search);
    if (filters.status && filters.status !== 'All') params.set('status', filters.status);
    if (filters.employee && filters.employee !== 'All') params.set('employee', filters.employee);
    if (filters.from)     params.set('from',     filters.from);
    if (filters.to)       params.set('to',       filters.to);
    // Trigger download
    window.location.href = `${API_BASE}/customers/export?${params}`;
  },

  // ── Logs ────────────────────────────────────────────────────────────────────
  logs: {
    getAll: async (page = 1) => {
      const r = await apiFetch(`/logs?page=${page}&limit=20`);
      return r; // { data, total, page, limit }
    },
    getToday: async () => {
      const r = await apiFetch('/logs?page=1&limit=100');
      const today = new Date().toISOString().split('T')[0];
      return r.data.filter(l => l.upload_date?.startsWith(today));
    },
  },

  // ── Dashboard ───────────────────────────────────────────────────────────────
  getDashboardData: async () => {
    const r = await apiFetch('/dashboard');
    return r.data; // { stats, todayUploads, todayUpdated, trend, performance }
  },

  // ── Settings ────────────────────────────────────────────────────────────────
  settings: {
    get: async (key) => {
      const r = await apiFetch(`/settings/${key}`);
      return r.data;
    },
    set: async (key, value) => {
      await apiFetch(`/settings/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ value }),
      });
    },
  },
};
