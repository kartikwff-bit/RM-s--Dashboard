// app2.js – Pages: Upload, Customers, Logs, Admin (Async Version)
// ═══════════════════════════════════════════════════════════
// UPLOAD PAGE
// ═══════════════════════════════════════════════════════════
function renderUpload(container) {
  container.innerHTML = `
    <div class="fade-in" style="max-width:720px;">
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><span class="card-title">📤 Upload Customer Excel</span></div>
        <div class="info-box">
          <strong>Expected Format:</strong> Column A = Customer Name &nbsp;|&nbsp; Column B = PAN Card &nbsp;|&nbsp; Column C = Status<br>
          Supported: <strong>.xlsx only</strong> &nbsp;|&nbsp; Max size: <strong>5 MB</strong>
        </div>
        <div class="upload-zone" id="upload-zone" onclick="document.getElementById('file-input').click()"
             ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">
          <div class="upload-icon">📁</div>
          <div class="upload-title">Drop your Excel file here</div>
          <div class="upload-sub">or click to browse</div>
          <div class="upload-btn-wrap">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();document.getElementById('file-input').click()">Choose File</button>
          </div>
        </div>
        <input type="file" id="file-input" accept=".xlsx" style="display:none" onchange="handleFileSelect(event)">
        <div id="upload-progress" style="display:none;margin-top:12px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text2);margin-bottom:4px;">
            <span id="progress-label">Uploading to server…</span><span id="progress-pct">0%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" id="progress-fill" style="width:0%"></div></div>
        </div>
      </div>
      <div id="upload-result"></div>
    </div>`;
}

function handleDragOver(e) { e.preventDefault(); document.getElementById('upload-zone').classList.add('drag-over'); }
function handleDragLeave() { document.getElementById('upload-zone').classList.remove('drag-over'); }
function handleDrop(e) {
  e.preventDefault(); handleDragLeave();
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}
function handleFileSelect(e) { const file = e.target.files[0]; if (file) processFile(file); }

async function processFile(file) {
  if (!file.name.endsWith('.xlsx')) { toast('error', 'Invalid file type', 'Only .xlsx files are supported'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('error', 'File too large', 'Max file size is 5 MB'); return; }

  const progress = document.getElementById('upload-progress');
  const fill = document.getElementById('progress-fill');
  const pct = document.getElementById('progress-pct');
  const label = document.getElementById('progress-label');
  progress.style.display = 'block';

  let p = 0;
  const interval = setInterval(() => { p = Math.min(p + 5, 85); fill.style.width = p + '%'; pct.textContent = p + '%'; }, 100);

  try {
    const result = await DB.processUpload(file, State.currentEmployee.employee_name);
    clearInterval(interval);
    fill.style.width = '100%'; pct.textContent = '100%'; label.textContent = 'Complete!';
    showUploadResult(result, file.name);
  } catch (err) {
    clearInterval(interval);
    progress.style.display = 'none';
    toast('error', 'Upload failed', err.message);
  }
}

function showUploadResult(result, filename) {
  const { created, updated, duplicatesInFile, failed, warnings, total } = result;
  const resultDiv = document.getElementById('upload-result');
  const dupHTML = duplicatesInFile.length ? `
    <div class="warn-box">
      <div class="warn-title">⚠️ ${duplicatesInFile.length} Duplicate PAN(s) found in file — kept last occurrence</div>
      <div class="warn-list">${duplicatesInFile.join(', ')}</div>
    </div>` : '';
  const warnHTML = warnings.filter(w => !w.startsWith('Row')).length ? `
    <div class="warn-box">
      <div class="warn-title">⚠️ Validation Warnings</div>
      <div class="warn-list">${warnings.filter(w => !w.startsWith('Row')).join('<br>')}</div>
    </div>` : '';

  resultDiv.innerHTML = `
    <div class="card fade-in">
      <div class="card-header"><span class="card-title">✅ Upload Complete — ${filename}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:16px;">
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:var(--info)">${total}</div><div style="font-size:12px;color:var(--text2)">Total Rows</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:var(--success)">${created}</div><div style="font-size:12px;color:var(--text2)">Created</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:var(--primary-light)">${updated}</div><div style="font-size:12px;color:var(--text2)">Updated</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:var(--warning)">${duplicatesInFile.length}</div><div style="font-size:12px;color:var(--text2)">Duplicates</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:var(--danger)">${failed}</div><div style="font-size:12px;color:var(--text2)">Failed</div>
        </div>
      </div>
      ${dupHTML}${warnHTML}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="navigate('customers')">View Customers →</button>
        <button class="btn btn-secondary" onclick="navigate('upload')">Upload Another</button>
      </div>
    </div>`;
  toast('success', 'Upload successful', `${created} created, ${updated} updated`);
}

// ═══════════════════════════════════════════════════════════
// CUSTOMERS PAGE
// ═══════════════════════════════════════════════════════════
let custPage = 1;
let custFilters = { search: '', status: 'All', employee: 'All', from: '', to: '' };

async function renderCustomers(container) {
  try {
    const emps = await DB.employees.getAll();
    const empOpts = ['All', ...emps.map(e => e.employee_name)].map(n => `<option value="${n}">${n}</option>`).join('');
    container.innerHTML = `
      <div class="fade-in">
        <div class="search-bar">
          <div class="search-input-wrap">
            <span class="search-icon">🔍</span>
            <input class="search-input" id="cust-search" placeholder="Search by PAN or Customer Name…"
              value="${custFilters.search}" oninput="custFilters.search=this.value;custPage=1;refreshCustTable()">
          </div>
          <div class="filter-group">
            <select class="filter-select" id="cust-status" onchange="custFilters.status=this.value;custPage=1;refreshCustTable()">
              <option value="All">All Status</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option><option value="Pending">Pending</option>
            </select>
            <select class="filter-select" id="cust-emp" onchange="custFilters.employee=this.value;custPage=1;refreshCustTable()">${empOpts}</select>
            <input type="date" class="filter-select" id="cust-from" title="From date" value="${custFilters.from}" onchange="custFilters.from=this.value;custPage=1;refreshCustTable()">
            <input type="date" class="filter-select" id="cust-to" title="To date" value="${custFilters.to}" onchange="custFilters.to=this.value;custPage=1;refreshCustTable()">
            <button class="btn btn-secondary btn-sm" onclick="custFilters={search:'',status:'All',employee:'All',from:'',to:''};custPage=1;renderCustomers(document.getElementById('page-content'))">Reset</button>
          </div>
          <button class="btn btn-outline btn-sm" onclick="exportFiltered()">⬇️ Export</button>
        </div>
        <div class="card"><div id="cust-table-wrap">Loading...</div></div>
      </div>`;
    // Restore filter UI state
    document.getElementById('cust-status').value = custFilters.status;
    document.getElementById('cust-emp').value = custFilters.employee;
    refreshCustTable();
  } catch (err) { container.innerHTML = `Error: ${err.message}`; }
}

async function refreshCustTable() {
  try {
    const res = await DB.customers.getAll(custFilters, custPage);
    const pag = { page: res.page, limit: res.limit, total: Math.ceil(res.total / res.limit), totalRecords: res.total };
    
    const rows = res.data.map((r, i) => `
      <tr>
        <td style="color:var(--text3)">${(custPage - 1) * res.limit + i + 1}</td>
        <td style="font-weight:500;color:var(--text)">${r.customer_name}</td>
        <td><code style="background:var(--bg);padding:2px 8px;border-radius:4px;font-size:12px;">${r.pan_card}</code></td>
        <td>${statusBadge(r.status)}</td>
        <td>${r.uploaded_by || '—'}</td>
        <td style="font-size:12px;">${r.updated_at?.replace('T', ' ').slice(0, 16) || '—'}</td>
      </tr>`).join('');

    const empty = res.total === 0 ? `
      <div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-title">No customers found</div></div>` : '';

    document.getElementById('cust-table-wrap').innerHTML = `
      ${empty || `<div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Customer Name</th><th>PAN Card</th><th>Status</th><th>Uploaded By</th><th>Updated At</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      ${renderPagination(pag, 'changeCustPage')}`}`;
  } catch (err) { document.getElementById('cust-table-wrap').innerHTML = `Error: ${err.message}`; }
}

function changeCustPage(p) { custPage = p; refreshCustTable(); }
function exportFiltered() { DB.exportToExcel(custFilters); toast('success', 'Export started', 'File will download shortly'); }

// ═══════════════════════════════════════════════════════════
// UPLOAD LOGS PAGE
// ═══════════════════════════════════════════════════════════
let logPage = 1;
async function renderLogs(container) {
  container.innerHTML = `<div class="fade-in"><div class="card"><div id="logs-wrap">Loading...</div></div></div>`;
  refreshLogs();
}

async function refreshLogs() {
  try {
    const res = await DB.logs.getAll(logPage);
    const pag = { page: res.page, limit: res.limit, total: Math.ceil(res.total / res.limit), totalRecords: res.total };
    const rows = res.data.map((l, i) => `
      <tr>
        <td style="color:var(--text3)">${(logPage-1)*res.limit+i+1}</td>
        <td style="font-weight:500;color:var(--text)">${l.employee_name}</td>
        <td style="font-size:12px;">${l.upload_date?.replace('T',' ').slice(0,16) || '—'}</td>
        <td>${l.total_rows}</td>
        <td><span class="badge badge-success">${l.created_records}</span></td>
        <td><span class="badge badge-info">${l.updated_records}</span></td>
        <td><span class="badge badge-warning">${l.duplicate_records}</span></td>
        <td><span class="badge badge-danger">${l.failed_records}</span></td>
      </tr>`).join('');

    const empty = res.total === 0 ? `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No upload logs yet</div></div>` : '';

    document.getElementById('logs-wrap').innerHTML = `
      <div class="card-header"><span class="card-title">📋 Upload History</span><span style="font-size:12px;color:var(--text3)">${res.total} total uploads</span></div>
      ${empty || `<div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Employee</th><th>Upload Time</th><th>Total Rows</th><th>Created</th><th>Updated</th><th>Duplicates</th><th>Failed</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      ${renderPagination(pag, 'changeLogPage')}`}`;
  } catch (err) { document.getElementById('logs-wrap').innerHTML = `Error: ${err.message}`; }
}
function changeLogPage(p) { logPage = p; refreshLogs(); }

// ═══════════════════════════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════════════════════════
async function renderAdmin(container) {
  if (State.currentEmployee?.id !== 'admin') {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Admin Access Required</div></div>`;
    return;
  }
  container.innerHTML = `
    <div class="fade-in">
      <div class="tabs">
        <button class="tab-btn active" id="tab-emp" onclick="switchAdminTab('emp')">👤 Employees</button>
        <button class="tab-btn" id="tab-perf" onclick="switchAdminTab('perf')">📊 Performance</button>
        <button class="tab-btn" id="tab-settings" onclick="switchAdminTab('settings')">🔐 Settings</button>
      </div>
      <div id="admin-tab-content">Loading...</div>
    </div>`;
  renderAdminEmployees();
}

async function switchAdminTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
  if (tab === 'emp') await renderAdminEmployees();
  else if (tab === 'perf') await renderAdminPerformance();
  else if (tab === 'settings') await renderAdminSettings();
}

async function renderAdminEmployees() {
  try {
    const emps = await DB.employees.getAll();
    const rows = emps.map(e => `
      <tr>
        <td style="font-weight:600;color:var(--text)">${e.employee_name}</td>
        <td>${e.active_status ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-danger">Inactive</span>'}</td>
        <td style="font-size:12px;">${e.created_at?.slice(0,10) || '—'}</td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="editEmployee('${e.id}','${e.employee_name.replace(/'/g,"\\'")}')">✏️ Edit</button>
            <button class="btn btn-outline btn-sm" onclick="openSetPassword('${e.id}','${e.employee_name.replace(/'/g,"\\'")}')">🔑 Password</button>
            <label class="switch" title="Toggle active"><input type="checkbox" ${e.active_status ? 'checked' : ''} onchange="toggleEmpStatus('${e.id}')"><span class="switch-slider"></span></label>
            <button class="btn btn-danger btn-sm" onclick="removeEmployee('${e.id}','${e.employee_name.replace(/'/g,"\\'")}')">🗑️</button>
          </div>
        </td>
      </tr>`).join('');

    document.getElementById('admin-tab-content').innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">👤 Employee Management</span><button class="btn btn-primary btn-sm" onclick="openAddEmployee()">+ Add Employee</button></div>
        <div class="info-box" style="margin-bottom:12px;">🔑 Default password for new employees is <strong>1234</strong>.</div>
        <div class="table-wrap"><table><thead><tr><th>Name</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`;
  } catch (err) { document.getElementById('admin-tab-content').innerHTML = `Error: ${err.message}`; }
}

function openAddEmployee() {
  modal('modal-emp', '➕ Add New Employee',
    `<div class="form-group"><label class="form-label">Employee Name *</label><input class="form-control" id="new-emp-name" placeholder="Full Name" maxlength="60" /></div>
    <div class="form-group"><label class="form-label">Password *</label>
      <div style="position:relative;">
        <input type="password" class="form-control" id="new-emp-pass" placeholder="Min 4 characters" style="padding-right:44px;" />
        <button type="button" onclick="toggleModalPass('new-emp-pass','new-emp-eye')" id="new-emp-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3);">👁️</button>
      </div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px;">Leave blank to use default: <strong>1234</strong></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modal-emp')">Cancel</button><button class="btn btn-primary" onclick="saveNewEmployee()">Add Employee</button>`
  );
  setTimeout(() => document.getElementById('new-emp-name')?.focus(), 100);
}

function toggleModalPass(inpId, eyeId) {
  const i=document.getElementById(inpId), e=document.getElementById(eyeId);
  if(i){ i.type = i.type==='password'?'text':'password'; if(e) e.textContent = i.type==='password'?'👁️':'🙈'; }
}

async function saveNewEmployee() {
  const name = document.getElementById('new-emp-name')?.value.trim();
  const pass = document.getElementById('new-emp-pass')?.value.trim() || '1234';
  if (!name) { toast('warning', 'Name required', ''); return; }
  if (pass.length < 4) { toast('warning', 'Password too short', ''); return; }
  try {
    await DB.employees.add(name, pass);
    closeModal('modal-emp'); await renderAdminEmployees(); toast('success', 'Employee added', `${name}`);
  } catch (err) { toast('error', 'Error', err.message); }
}

function editEmployee(id, name) {
  modal('modal-edit-emp', 'Edit Employee',
    `<div class="form-group"><label class="form-label">Employee Name *</label><input class="form-control" id="edit-emp-name" value="${name}" maxlength="60" /></div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modal-edit-emp')">Cancel</button><button class="btn btn-primary" onclick="saveEditEmployee('${id}')">Save Changes</button>`
  );
}

async function saveEditEmployee(id) {
  const name = document.getElementById('edit-emp-name')?.value.trim();
  if (!name) { toast('warning', 'Name required', ''); return; }
  try { await DB.employees.update(id, name); closeModal('modal-edit-emp'); await renderAdminEmployees(); toast('success', 'Updated', name); } catch (err) { toast('error', 'Error', err.message); }
}

async function toggleEmpStatus(id) {
  try { await DB.employees.toggleStatus(id); await renderAdminEmployees(); toast('info', 'Status updated', ''); } catch (err) { toast('error', 'Error', err.message); }
}

function removeEmployee(id, name) {
  modal('modal-confirm-del', 'Remove Employee',
    `<p style="color:var(--text2)">Are you sure you want to remove <strong style="color:var(--text)">${name}</strong>?</p>`,
    `<button class="btn btn-secondary" onclick="closeModal('modal-confirm-del')">Cancel</button><button class="btn btn-danger" onclick="confirmRemoveEmployee('${id}')">Remove</button>`
  );
}

async function confirmRemoveEmployee(id) {
  try { await DB.employees.remove(id); closeModal('modal-confirm-del'); await renderAdminEmployees(); toast('success', 'Removed', ''); } catch (err) { toast('error', 'Error', err.message); }
}

function openSetPassword(id, name) {
  modal('modal-set-pass', `🔑 Set Password — ${name}`,
    `<div class="form-group"><label class="form-label">New Password *</label>
      <div style="position:relative;"><input type="password" class="form-control" id="new-pass-input" placeholder="Min 4 characters" style="padding-right:44px;" />
        <button type="button" onclick="toggleModalPass('new-pass-input','set-pass-eye')" id="set-pass-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3);">👁️</button>
      </div></div>
    <div class="form-group"><label class="form-label">Confirm Password *</label><input type="password" class="form-control" id="confirm-pass-input" placeholder="Re-enter password" /></div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modal-set-pass')">Cancel</button><button class="btn btn-primary" onclick="saveEmpPassword('${id}')">💾 Save</button>`
  );
}

async function saveEmpPassword(id) {
  const np = document.getElementById('new-pass-input')?.value.trim();
  const cp = document.getElementById('confirm-pass-input')?.value.trim();
  if (!np || np.length < 4) { toast('warning', 'Too short', 'Min 4 characters'); return; }
  if (np !== cp) { toast('error', 'Mismatch', 'Passwords do not match'); return; }
  try { await DB.employees.setPassword(id, np); closeModal('modal-set-pass'); toast('success', 'Password updated', ''); } catch (err) { toast('error', 'Error', err.message); }
}

async function renderAdminSettings() {
  document.getElementById('admin-tab-content').innerHTML = `
    <div class="card" style="max-width:480px;">
      <div class="card-header"><span class="card-title">🔐 Change Admin Password</span></div>
      <div class="form-group"><label class="form-label">New Admin Password *</label>
        <div style="position:relative;"><input type="password" class="form-control" id="admin-new-pass" placeholder="Min 6 characters" style="padding-right:44px;" />
          <button type="button" onclick="toggleModalPass('admin-new-pass','admin-pass-eye')" id="admin-pass-eye" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:16px;color:var(--text3);">👁️</button>
        </div></div>
      <div class="form-group"><label class="form-label">Confirm New Password *</label><input type="password" class="form-control" id="admin-confirm-pass" placeholder="Re-enter new password" /></div>
      <button class="btn btn-primary" onclick="saveAdminPassword()">💾 Update Admin Password</button>
    </div>`;
}

async function saveAdminPassword() {
  const np = document.getElementById('admin-new-pass')?.value.trim();
  const cp = document.getElementById('admin-confirm-pass')?.value.trim();
  if (!np || np.length < 6) { toast('warning', 'Too short', 'Min 6 chars'); return; }
  if (np !== cp) { toast('error', 'Mismatch', 'Passwords do not match'); return; }
  try { await DB.settings.set('admin_password', np); toast('success', 'Updated', 'Admin password changed'); renderAdminSettings(); } catch (err) { toast('error', 'Error', err.message); }
}

async function renderAdminPerformance() {
  try {
    const data = await DB.getDashboardData();
    const rows = data.performance.map((e, i) => `
      <tr>
        <td style="color:var(--text3)">${i+1}</td><td style="font-weight:600;color:var(--text)">${e.employee_name}</td>
        <td style="font-weight:700;color:var(--primary-light)">${e.uploads}</td><td>${e.total_rows}</td>
        <td style="color:var(--success)">${e.created}</td><td style="color:var(--info)">${e.updated}</td>
      </tr>`).join('');

    document.getElementById('admin-tab-content').innerHTML = `
      <div class="card"><div class="card-header"><span class="card-title">📊 Employee Performance</span></div>
        <div class="table-wrap"><table><thead><tr><th>#</th><th>Employee</th><th>Uploads</th><th>Total Rows</th><th>Created</th><th>Updated</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="6" style="text-align:center;padding:32px">No data</td></tr>'}</tbody></table></div></div>`;
  } catch (err) { document.getElementById('admin-tab-content').innerHTML = `Error: ${err.message}`; }
}
