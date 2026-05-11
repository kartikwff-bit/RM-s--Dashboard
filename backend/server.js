/**
 * server.js — RM Tracker Backend
 * Node.js + Express + PostgreSQL
 * 
 * API Routes:
 *   GET    /api/employees           → List all employees
 *   POST   /api/employees           → Add employee
 *   PUT    /api/employees/:id       → Edit employee name
 *   PATCH  /api/employees/:id/status → Toggle active/inactive
 *   PATCH  /api/employees/:id/password → Change password
 *   DELETE /api/employees/:id       → Remove employee
 *   POST   /api/employees/verify    → Verify login password
 * 
 *   GET    /api/customers           → List customers (with filters)
 *   GET    /api/customers/stats     → Dashboard stats
 *   GET    /api/customers/export    → Export to Excel
 *   POST   /api/upload              → Upload & process Excel file
 * 
 *   GET    /api/logs                → Upload logs
 *   GET    /api/dashboard           → Dashboard data
 * 
 *   GET    /api/settings/:key       → Get a setting
 *   PUT    /api/settings/:key       → Update a setting
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const XLSX     = require('xlsx');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Database Pool ─────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Test DB connection on startup and run auto-migration
pool.connect()
  .then(async (client) => {
    console.log('✅ PostgreSQL connected');
    try {
      // Auto-run the schema.sql to ensure tables exist
      const fs = require('fs');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('✅ Database tables initialized successfully');
    } catch (err) {
      console.error('❌ Failed to run schema:', err.message);
    } finally {
      client.release();
    }
  })
  .catch(err => console.error('❌ DB connection error:', err.message));

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files (if frontend is in ../frontend folder)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Multer — memory storage for Excel uploads (max 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.xlsx')) cb(null, true);
    else cb(new Error('Only .xlsx files are allowed'));
  }
});

// ── Helper: PAN Validation ────────────────────────────────────────────────────
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const validatePAN = (pan) => PAN_REGEX.test(pan?.trim().toUpperCase());

// ── EMPLOYEES ROUTES ──────────────────────────────────────────────────────────

// GET all employees
app.get('/api/employees', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, employee_name, active_status, created_at FROM employees ORDER BY created_at ASC'
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST add employee
app.post('/api/employees', async (req, res) => {
  const { employee_name, password = '1234' } = req.body;
  if (!employee_name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
  if (password.trim().length < 4) return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO employees (employee_name, password) VALUES ($1, $2) RETURNING id, employee_name, active_status, created_at',
      [employee_name.trim(), password.trim()]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Employee already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST verify employee password (login)
app.post('/api/employees/verify', async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) return res.status(400).json({ success: false, error: 'ID and password required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, employee_name, active_status FROM employees WHERE id=$1 AND password=$2 AND active_status=true',
      [id, password.trim()]
    );
    if (!rows.length) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT edit employee name
app.put('/api/employees/:id', async (req, res) => {
  const { employee_name } = req.body;
  if (!employee_name?.trim()) return res.status(400).json({ success: false, error: 'Name is required' });
  try {
    const { rows } = await pool.query(
      'UPDATE employees SET employee_name=$1 WHERE id=$2 RETURNING id, employee_name, active_status, created_at',
      [employee_name.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH toggle active status
app.patch('/api/employees/:id/status', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE employees SET active_status = NOT active_status WHERE id=$1 RETURNING id, employee_name, active_status',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH change employee password
app.patch('/api/employees/:id/password', async (req, res) => {
  const { password } = req.body;
  if (!password?.trim() || password.trim().length < 4)
    return res.status(400).json({ success: false, error: 'Password must be at least 4 characters' });
  try {
    const { rows } = await pool.query(
      'UPDATE employees SET password=$1 WHERE id=$2 RETURNING id, employee_name',
      [password.trim(), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'Employee not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── CUSTOMERS ROUTES ──────────────────────────────────────────────────────────

// GET customers (with filters + pagination)
app.get('/api/customers', async (req, res) => {
  const { search, status, employee, from, to, page = 1, limit = 15 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const conditions = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(pan_card ILIKE $${params.length} OR customer_name ILIKE $${params.length})`);
  }
  if (status && status !== 'All') {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (employee && employee !== 'All') {
    params.push(employee);
    conditions.push(`uploaded_by = $${params.length}`);
  }
  if (from) {
    params.push(from);
    conditions.push(`updated_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`updated_at <= ($${params.length}::date + interval '1 day')`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM customers ${where}`, params);
    params.push(parseInt(limit), offset);
    const { rows } = await pool.query(
      `SELECT * FROM customers ${where} ORDER BY updated_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    res.json({ success: true, data: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET customer stats
app.get('/api/customers/stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Approved') AS approved,
        COUNT(*) FILTER (WHERE status='Rejected')  AS rejected,
        COUNT(*) FILTER (WHERE status='Pending')   AS pending
      FROM customers
    `);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET export customers as Excel
app.get('/api/customers/export', async (req, res) => {
  const { search, status, employee, from, to } = req.query;
  const params = [];
  const conditions = [];
  if (search) { params.push(`%${search}%`); conditions.push(`(pan_card ILIKE $${params.length} OR customer_name ILIKE $${params.length})`); }
  if (status && status !== 'All') { params.push(status); conditions.push(`status = $${params.length}`); }
  if (employee && employee !== 'All') { params.push(employee); conditions.push(`uploaded_by = $${params.length}`); }
  if (from) { params.push(from); conditions.push(`updated_at >= $${params.length}::date`); }
  if (to) { params.push(to); conditions.push(`updated_at <= ($${params.length}::date + interval '1 day')`); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const { rows } = await pool.query(`SELECT * FROM customers ${where} ORDER BY updated_at DESC`, params);
    const data = rows.map((r, i) => ({
      '#': i + 1,
      'Customer Name': r.customer_name,
      'PAN Card': r.pan_card,
      'Status': r.status,
      'Uploaded By': r.uploaded_by || '',
      'Created At': r.created_at?.toISOString().replace('T',' ').slice(0,19),
      'Updated At': r.updated_at?.toISOString().replace('T',' ').slice(0,19),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `RM_Customers_${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── UPLOAD ROUTE ──────────────────────────────────────────────────────────────
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const { uploaded_by } = req.body;
  if (!uploaded_by) return res.status(400).json({ success: false, error: 'uploaded_by is required' });

  try {
    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    let created = 0, updated = 0, failed = 0;
    const duplicatesInFile = [];
    const warnings = [];
    const seen = new Map();

    // First pass — deduplicate within file (keep last row per PAN)
    rows.forEach((row, idx) => {
      const rawPan = String(row['PAN Card'] || row['pan_card'] || row['PAN'] || '').trim().toUpperCase();
      const name   = String(row['Customer Name'] || row['customer_name'] || '').trim();
      const status = String(row['Status'] || row['status'] || '').trim();
      if (!rawPan) { failed++; return; }
      if (seen.has(rawPan)) {
        duplicatesInFile.push(rawPan);
        warnings.push(`Row ${idx + 2}: Duplicate PAN ${rawPan} – earlier entry overwritten`);
      }
      seen.set(rawPan, { customer_name: name, pan_card: rawPan, status });
    });

    // Second pass — upsert each unique PAN into DB
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [pan, record] of seen) {
        const { customer_name, status } = record;
        // Validate
        if (!validatePAN(pan))     { failed++; warnings.push(`Invalid PAN: ${pan}`); continue; }
        if (!customer_name)        { failed++; warnings.push(`Missing name for PAN: ${pan}`); continue; }
        if (!status)               { failed++; warnings.push(`Missing status for PAN: ${pan}`); continue; }
        if (!['Approved','Rejected','Pending'].includes(status)) {
          failed++; warnings.push(`Invalid status "${status}" for PAN: ${pan}`); continue;
        }

        // UPSERT — insert or update
        const result = await client.query(`
          INSERT INTO customers (customer_name, pan_card, status, uploaded_by)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (pan_card) DO UPDATE SET
            customer_name = EXCLUDED.customer_name,
            status        = EXCLUDED.status,
            uploaded_by   = EXCLUDED.uploaded_by,
            updated_at    = now()
          RETURNING (xmax = 0) AS is_new
        `, [customer_name, pan, status, uploaded_by]);

        if (result.rows[0].is_new) created++;
        else updated++;
      }

      // Save upload log
      await client.query(`
        INSERT INTO upload_logs (employee_name, total_rows, created_records, updated_records, duplicate_records, failed_records)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [uploaded_by, rows.length, created, updated, duplicatesInFile.length, failed]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally { client.release(); }

    res.json({ success: true, data: { created, updated, failed, duplicatesInFile: [...new Set(duplicatesInFile)], warnings, total: rows.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── LOGS ROUTES ───────────────────────────────────────────────────────────────
app.get('/api/logs', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM upload_logs');
    const { rows } = await pool.query(
      'SELECT * FROM upload_logs ORDER BY upload_date DESC LIMIT $1 OFFSET $2',
      [parseInt(limit), offset]
    );
    res.json({ success: true, data: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── DASHBOARD ROUTE ───────────────────────────────────────────────────────────
app.get('/api/dashboard', async (req, res) => {
  try {
    const [statsRes, todayRes, trendRes, perfRes] = await Promise.all([
      // Customer stats
      pool.query(`SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='Approved') AS approved,
        COUNT(*) FILTER (WHERE status='Rejected')  AS rejected,
        COUNT(*) FILTER (WHERE status='Pending')   AS pending
        FROM customers`),
      // Today's uploads
      pool.query(`SELECT COUNT(*) AS today_uploads, COALESCE(SUM(updated_records),0) AS today_updated
        FROM upload_logs WHERE upload_date::date = CURRENT_DATE`),
      // 7-day trend
      pool.query(`SELECT upload_date::date AS day, COUNT(*) AS count
        FROM upload_logs WHERE upload_date >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY day ORDER BY day ASC`),
      // Employee performance
      pool.query(`SELECT employee_name, COUNT(*) AS uploads,
        SUM(total_rows) AS total_rows, SUM(created_records) AS created, SUM(updated_records) AS updated
        FROM upload_logs GROUP BY employee_name ORDER BY uploads DESC`)
    ]);

    // Build 7-day trend array (fill missing days with 0)
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      const found = trendRes.rows.find(r => r.day.toISOString().split('T')[0] === key);
      trend.push({ label, count: found ? parseInt(found.count) : 0 });
    }

    res.json({ success: true, data: {
      stats: statsRes.rows[0],
      todayUploads: parseInt(todayRes.rows[0].today_uploads),
      todayUpdated: parseInt(todayRes.rows[0].today_updated),
      trend,
      performance: perfRes.rows
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── SETTINGS ROUTES ───────────────────────────────────────────────────────────
app.get('/api/settings/:key', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key=$1', [req.params.key]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Setting not found' });
    res.json({ success: true, data: rows[0].value });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/settings/:key', async (req, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ success: false, error: 'Value required' });
  try {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2',
      [req.params.key, value]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ── Catch-all: serve frontend index.html ─────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 RM Tracker Backend running on port ${PORT}`);
  console.log(`📊 Open http://localhost:${PORT} in your browser`);
});
