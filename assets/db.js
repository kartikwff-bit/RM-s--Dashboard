/**
 * db.js – Client-side database using localStorage.
 * Replace these functions with real API calls when a backend is available.
 * All PAN cards are stored in UPPERCASE with trimmed spaces.
 */

const DB = (() => {
  // ── Helpers ──────────────────────────────────────────────────────────────
  const get = (key, def = []) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } };
  const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));
  const uid = () => '_' + Math.random().toString(36).slice(2, 10);
  const now = () => new Date().toISOString();

  // ── Seed data ────────────────────────────────────────────────────────────
  const seed = () => {
    if (get('rm_seeded', false)) return;
    // ✏️ ADD YOUR TEAM NAMES HERE — default password for all is '1234'
    // Admin can change individual passwords from the Admin Panel
    set('employees', [
      { id: uid(), employee_name: 'Amit Sharma',  password: '1234', active_status: true,  created_at: now() },
      { id: uid(), employee_name: 'Priya Patel',  password: '1234', active_status: true,  created_at: now() },
      { id: uid(), employee_name: 'Rahul Verma',  password: '1234', active_status: true,  created_at: now() },
      { id: uid(), employee_name: 'Sneha Joshi',  password: '1234', active_status: true,  created_at: now() },
      // Add more names below:
      // { id: uid(), employee_name: 'Your Name Here', password: '1234', active_status: true, created_at: now() },
    ]);
    // Seed sample customers
    const emps = get('employees');
    const statuses = ['Approved', 'Rejected', 'Pending'];
    const customers = [];
    const pans = ['ABCDE1234F','BCDEA5678G','CDEAB9012H','DEABC3456I','EABCD7890J',
                   'FGHIJ1234K','GHIJK5678L','HIJKL9012M','IJKLM3456N','JKLMN7890O'];
    pans.forEach((pan, i) => {
      customers.push({
        id: uid(), customer_name: `Customer ${i + 1}`, pan_card: pan,
        status: statuses[i % 3], uploaded_by: emps[i % emps.length].employee_name,
        created_at: now(), updated_at: now()
      });
    });
    set('customers', customers);
    set('upload_logs', []);
    set('rm_seeded', true);
  };

  seed();

  // ── Migration: add default password to employees that don't have one ──────
  const migratePasswords = () => {
    const emps = get('employees');
    const needsMigration = emps.some(e => !e.password);
    if (!needsMigration) return;
    const patched = emps.map(e => ({ ...e, password: e.password || '1234' }));
    set('employees', patched);
  };
  migratePasswords();

  // ── Employees ─────────────────────────────────────────────────────────────
  const employees = {
    getAll: () => get('employees'),
    getActive: () => get('employees').filter(e => e.active_status),
    getById: (id) => get('employees').find(e => e.id === id),
    add: (name, password = '1234') => {
      const emps = get('employees');
      const exists = emps.some(e => e.employee_name.toLowerCase() === name.toLowerCase());
      if (exists) throw new Error('Employee already exists');
      const emp = { id: uid(), employee_name: name.trim(), password: password.trim() || '1234', active_status: true, created_at: now() };
      set('employees', [...emps, emp]);
      return emp;
    },
    // Verify employee password — returns employee object or null
    verify: (id, password) => {
      const emp = get('employees').find(e => e.id === id);
      if (!emp) return null;
      if (emp.password !== password.trim()) return null;
      return emp;
    },
    // Change password for an employee
    setPassword: (id, newPassword) => {
      if (!newPassword || newPassword.trim().length < 4) throw new Error('Password must be at least 4 characters');
      const emps = get('employees').map(e => e.id === id ? { ...e, password: newPassword.trim() } : e);
      set('employees', emps);
      return emps.find(e => e.id === id);
    },
    update: (id, name) => {
      const emps = get('employees').map(e => e.id === id ? { ...e, employee_name: name.trim() } : e);
      set('employees', emps);
      return emps.find(e => e.id === id);
    },
    toggleStatus: (id) => {
      const emps = get('employees').map(e => e.id === id ? { ...e, active_status: !e.active_status } : e);
      set('employees', emps);
      return emps.find(e => e.id === id);
    },
    remove: (id) => {
      set('employees', get('employees').filter(e => e.id !== id));
    }
  };

  // ── Customers ─────────────────────────────────────────────────────────────
  const customers = {
    getAll: (filters = {}) => {
      let rows = get('customers');
      if (filters.search) {
        const s = filters.search.toLowerCase();
        rows = rows.filter(r => r.pan_card.toLowerCase().includes(s) || r.customer_name.toLowerCase().includes(s));
      }
      if (filters.status && filters.status !== 'All') rows = rows.filter(r => r.status === filters.status);
      if (filters.employee && filters.employee !== 'All') rows = rows.filter(r => r.uploaded_by === filters.employee);
      if (filters.from) rows = rows.filter(r => r.updated_at >= filters.from);
      if (filters.to) rows = rows.filter(r => r.updated_at <= filters.to + 'T23:59:59');
      return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    getStats: () => {
      const rows = get('customers');
      return {
        total: rows.length,
        approved: rows.filter(r => r.status === 'Approved').length,
        rejected: rows.filter(r => r.status === 'Rejected').length,
        pending: rows.filter(r => r.status === 'Pending').length,
      };
    },
    upsert: (record) => {
      // Normalize PAN
      const pan = record.pan_card.trim().toUpperCase();
      const all = get('customers');
      const idx = all.findIndex(r => r.pan_card === pan);
      if (idx > -1) {
        // UPDATE existing
        all[idx] = { ...all[idx], customer_name: record.customer_name.trim(), status: record.status.trim(),
                     uploaded_by: record.uploaded_by, updated_at: now() };
        set('customers', all);
        return { action: 'updated', record: all[idx] };
      } else {
        // CREATE new
        const newRec = { id: uid(), customer_name: record.customer_name.trim(), pan_card: pan,
                         status: record.status.trim(), uploaded_by: record.uploaded_by,
                         created_at: now(), updated_at: now() };
        set('customers', [...all, newRec]);
        return { action: 'created', record: newRec };
      }
    },
  };

  // ── Upload Logs ───────────────────────────────────────────────────────────
  const logs = {
    getAll: () => get('upload_logs').sort((a, b) => b.upload_date.localeCompare(a.upload_date)),
    getToday: () => {
      const today = new Date().toISOString().split('T')[0];
      return get('upload_logs').filter(l => l.upload_date.startsWith(today));
    },
    add: (log) => {
      const entry = { id: uid(), ...log, upload_date: now() };
      set('upload_logs', [entry, ...get('upload_logs')]);
      return entry;
    }
  };

  // ── Upload logic ──────────────────────────────────────────────────────────
  /**
   * Process parsed Excel rows.
   * Returns { created, updated, duplicatesInFile, failed, warnings }
   */
  const processUpload = (rows, uploadedBy) => {
    const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    const seen = new Map(); // track duplicate PANs within the file
    const warnings = [];
    const duplicatesInFile = [];
    let created = 0, updated = 0, failed = 0;

    // First pass: deduplicate within file (keep last occurrence)
    rows.forEach((row, idx) => {
      const rawPan = String(row['PAN Card'] || row['pan_card'] || row['PAN'] || '').trim().toUpperCase();
      const customerName = String(row['Customer Name'] || row['customer_name'] || '').trim();
      const status = String(row['Status'] || row['status'] || '').trim();

      if (!rawPan) { failed++; return; }
      if (seen.has(rawPan)) {
        duplicatesInFile.push(rawPan);
        warnings.push(`Row ${idx + 2}: Duplicate PAN ${rawPan} – earlier entry overwritten`);
      }
      seen.set(rawPan, { customer_name: customerName, pan_card: rawPan, status, uploaded_by: uploadedBy });
    });

    // Second pass: upsert to DB
    seen.forEach((record) => {
      const pan = record.pan_card;
      const name = record.customer_name;
      const status = record.status;

      // Validate PAN
      if (!PAN_REGEX.test(pan)) { failed++; warnings.push(`Invalid PAN format: ${pan}`); return; }
      if (!name) { failed++; warnings.push(`Missing customer name for PAN: ${pan}`); return; }
      if (!status) { failed++; warnings.push(`Missing status for PAN: ${pan}`); return; }

      const result = customers.upsert(record);
      if (result.action === 'created') created++;
      else updated++;
    });

    const log = logs.add({
      employee_name: uploadedBy,
      total_rows: rows.length,
      created_records: created,
      updated_records: updated,
      duplicate_records: duplicatesInFile.length,
      failed_records: failed
    });

    return { created, updated, duplicatesInFile, failed, warnings, log };
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportToExcel = (filters = {}) => {
    const rows = customers.getAll(filters);
    const data = rows.map((r, i) => ({
      '#': i + 1,
      'Customer Name': r.customer_name,
      'PAN Card': r.pan_card,
      'Status': r.status,
      'Uploaded By': r.uploaded_by,
      'Created At': r.created_at?.replace('T', ' ').slice(0, 19),
      'Updated At': r.updated_at?.replace('T', ' ').slice(0, 19),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `RM_Customers_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ── Dashboard Stats ───────────────────────────────────────────────────────
  const getDashboardData = () => {
    const stats = customers.getStats();
    const todayLogs = logs.getToday();
    const allLogs = logs.getAll();
    const todayUploads = todayLogs.length;
    const todayUpdated = todayLogs.reduce((s, l) => s + l.updated_records, 0);

    // Last 7 days upload trend
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const count = allLogs.filter(l => l.upload_date.startsWith(key)).length;
      trend.push({ label, count });
    }

    return { stats, todayUploads, todayUpdated, trend };
  };

  return { employees, customers, logs, processUpload, exportToExcel, getDashboardData };
})();
