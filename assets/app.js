// app.js – Core SPA, State, and Dashboard
// ═══════════════════════════════════════════════════════════
// STATE MANAGEMENT & ROUTING
// ═══════════════════════════════════════════════════════════
const State = {
  currentPage: 'dashboard',
  currentEmployee: null,
  sidebarCollapsed: false,
};

function navigate(page) {
  State.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`nav-${page}`)?.classList.add('active');
  const content = document.getElementById('page-content');
  content.style.opacity = '0';
  setTimeout(async () => {
    content.innerHTML = ''; // clear old content
    if (page === 'dashboard') await renderDashboard(content);
    else if (page === 'upload') renderUpload(content);
    else if (page === 'customers') await renderCustomers(content);
    else if (page === 'logs') await renderLogs(content);
    else if (page === 'admin') await renderAdmin(content);
    content.style.opacity = '1';
  }, 200);
}

function logout() {
  State.currentEmployee = null;
  sessionStorage.removeItem('rm_employee');
  renderEmployeeSelect();
}

// ═══════════════════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════
function toast(type, title, message) {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type} fade-in`;
  t.innerHTML = `
    <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-sub">${message}</div>` : ''}
    </div>
  `;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}

// ═══════════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════════
function modal(id, title, bodyHTML, footerHTML = '') {
  const existing = document.getElementById(id);
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = id;
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal fade-in">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" onclick="closeModal('${id}')">✕</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 200);
  }
}

// ═══════════════════════════════════════════════════════════
// PAGINATION HELPER (UI)
// ═══════════════════════════════════════════════════════════
function renderPagination(pag, onPage) {
  if (pag.total <= 1) return '';
  const btns = [];
  btns.push(`<button class="page-btn" ${pag.page === 1 ? 'disabled' : ''} onclick="(${onPage})(${pag.page - 1})">‹</button>`);
  for (let i = 1; i <= Math.min(pag.total, 7); i++) {
    if (pag.total > 7 && i > 4 && i < pag.total) { if (i === 5) btns.push(`<span class="page-info">…</span>`); continue; }
    btns.push(`<button class="page-btn ${i === pag.page ? 'active' : ''}" onclick="(${onPage})(${i})">${i}</button>`);
  }
  if (pag.total > 7) btns.push(`<button class="page-btn ${pag.total === pag.page ? 'active' : ''}" onclick="(${onPage})(${pag.total})">${pag.total}</button>`);
  btns.push(`<button class="page-btn" ${pag.page === pag.total ? 'disabled' : ''} onclick="(${onPage})(${pag.page + 1})">›</button>`);
  btns.push(`<span class="page-info">${pag.count || pag.totalRecords} records</span>`);
  return `<div class="pagination">${btns.join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEE SELECT PAGE (with Password)
// ═══════════════════════════════════════════════════════════
async function renderEmployeeSelect() {
  const emps = await DB.employees.getActive();
  const opts = emps.map(e => `<option value="${e.id}">${e.employee_name}</option>`).join('');
  document.getElementById('app').innerHTML = `
    <div class="select-page">
      <div class="select-card fade-in">
        <div class="select-logo">📊</div>
        <h1 class="select-title">RM Customer Tracker</h1>
        <p class="select-sub">Professional Customer Status Management System</p>

        <div class="form-group" style="text-align:left;">
          <label class="form-label" style="color:var(--text2);font-size:12px;letter-spacing:.5px;">SELECT YOUR NAME</label>
          <select id="emp-select" class="select-dropdown" style="margin-bottom:0;">
            <option value="">— Select Your Name —</option>
            ${opts}
          </select>
        </div>

        <div class="form-group" style="text-align:left;margin-top:12px;">
          <label class="form-label" style="color:var(--text2);font-size:12px;letter-spacing:.5px;">PASSWORD</label>
          <div style="position:relative;">
            <input type="password" id="emp-password" class="select-dropdown"
              placeholder="Enter your password"
              style="margin-bottom:0;padding-right:44px;"
              onkeydown="if(event.key==='Enter') handleEmployeeSelect()"
              autocomplete="current-password" />
            <button onclick="togglePassVis()" id="pass-eye"
              style="position:absolute;right:12px;top:50%;transform:translateY(-50%);
                     background:none;border:none;cursor:pointer;font-size:18px;color:var(--text3);">👁️</button>
          </div>
        </div>

        <div id="login-error" style="display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);
          border-radius:8px;padding:10px 14px;font-size:13px;color:#f87171;margin-bottom:8px;text-align:left;">
          ❌ Incorrect password. Please try again.
        </div>

        <button class="btn btn-primary btn-lg select-btn" onclick="handleEmployeeSelect()" style="margin-top:4px;" id="login-btn">
          🔓 Login
        </button>

        <div class="select-footer" style="margin-top:20px;">
          ${emps.length} active employee${emps.length !== 1 ? 's' : ''} &nbsp;•&nbsp; Admin?
          <a href="#" onclick="handleAdminLogin()" style="color:var(--primary-light)">Open Admin Panel</a>
        </div>
      </div>
    </div>`;
}

function togglePassVis() {
  const inp = document.getElementById('emp-password');
  const eye = document.getElementById('pass-eye');
  if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; eye.textContent = '🙈'; }
  else { inp.type = 'password'; eye.textContent = '👁️'; }
}

async function handleEmployeeSelect() {
  const sel = document.getElementById('emp-select');
  const passEl = document.getElementById('emp-password');
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  if (!sel.value) { toast('warning', 'Select your name', ''); return; }
  const password = passEl?.value || '';
  if (!password) { toast('warning', 'Enter your password', ''); passEl?.focus(); return; }

  btn.innerHTML = '⏳ Verifying...';
  btn.disabled = true;

  try {
    const emp = await DB.employees.verify(sel.value, password);
    if (!emp) {
      if (errEl) errEl.style.display = 'block';
      passEl.value = ''; passEl.focus();
      passEl.style.borderColor = 'var(--danger)';
      passEl.style.boxShadow = '0 0 0 3px rgba(239,68,68,.2)';
      setTimeout(() => { passEl.style.borderColor = ''; passEl.style.boxShadow = ''; }, 2000);
      btn.innerHTML = '🔓 Login';
      btn.disabled = false;
      return;
    }
    if (errEl) errEl.style.display = 'none';
    State.currentEmployee = emp;
    renderApp();
  } catch (err) {
    toast('error', 'Login Error', err.message);
    btn.innerHTML = '🔓 Login';
    btn.disabled = false;
  }
}

function handleAdminLogin() {
  modal('modal-admin-login', '🔐 Admin Login',
    `<div class="form-group">
      <label class="form-label">Admin Password</label>
      <input type="password" class="form-control" id="admin-pass-input"
        placeholder="Enter admin password"
        onkeydown="if(event.key==='Enter') verifyAdminLogin()" />
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal('modal-admin-login')">Cancel</button>
     <button class="btn btn-primary" onclick="verifyAdminLogin()">Login as Admin</button>`
  );
  setTimeout(() => document.getElementById('admin-pass-input')?.focus(), 100);
}

async function verifyAdminLogin() {
  const pass = document.getElementById('admin-pass-input')?.value || '';
  try {
    const adminPass = await DB.settings.get('admin_password');
    if (pass !== adminPass) {
      toast('error', 'Wrong admin password', '');
      return;
    }
    closeModal('modal-admin-login');
    State.currentEmployee = { id: 'admin', employee_name: 'Admin', active_status: true };
    State.currentPage = 'admin';
    renderApp();
  } catch (err) {
    toast('error', 'Error', err.message);
  }
}

// ═══════════════════════════════════════════════════════════
// APP SHELL
// ═══════════════════════════════════════════════════════════
function renderApp() {
  saveSession();
  const isAdmin = State.currentEmployee?.id === 'admin';
  const navItems = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'upload', icon: '📤', label: 'Upload Excel' },
    { id: 'customers', icon: '👥', label: 'Customers' },
    { id: 'logs', icon: '📋', label: 'Upload Logs' },
    ...(isAdmin ? [{ id: 'admin', icon: '⚙️', label: 'Admin Panel' }] : []),
  ];
  const navHTML = navItems.map(n => `
    <div class="nav-item ${State.currentPage === n.id ? 'active' : ''}" id="nav-${n.id}" onclick="navigate('${n.id}')">
      <span class="nav-icon">${n.icon}</span>
      <span class="nav-label-text">${n.label}</span>
    </div>`).join('');

  document.getElementById('app').innerHTML = `
    <div class="sidebar ${State.sidebarCollapsed ? 'collapsed' : ''}" id="sidebar">
      <div class="sidebar-logo">
        <div class="logo-icon">📊</div>
        <div class="logo-text">RM Tracker<div class="logo-sub">Customer Management</div></div>
      </div>
      <div class="nav-section">
        <div class="nav-label">Menu</div>
        ${navHTML}
      </div>
      <div class="nav-section" style="flex:0;border-top:1px solid var(--border);padding-top:8px;">
        <div class="nav-item" onclick="logout()">
          <span class="nav-icon" style="color:var(--danger)">🚪</span>
          <span class="nav-label-text" style="color:var(--danger)">Logout</span>
        </div>
      </div>
    </div>
    <div class="main ${State.sidebarCollapsed ? 'expanded' : ''}" id="main-area">
      <div class="topbar">
        <div class="topbar-left">
          <button class="btn-icon" onclick="toggleSidebar()">☰</button>
          <div class="page-title" id="page-title-text">${navItems.find(n => n.id === State.currentPage)?.label || 'Dashboard'}</div>
        </div>
        <div class="topbar-right">
          <div class="employee-badge">
            <div class="badge-dot"></div>
            <span>${State.currentEmployee.employee_name}</span>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="logout()" style="border-color:var(--danger);color:var(--danger);background:rgba(239,68,68,0.05);">
            🚪 Logout
          </button>
        </div>
      </div>
      <div class="content" id="page-content"></div>
    </div>`;

  navigate(State.currentPage);
}

function toggleSidebar() {
  State.sidebarCollapsed = !State.sidebarCollapsed;
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main-area');
  if (State.sidebarCollapsed) {
    sidebar.classList.add('collapsed');
    main.classList.add('expanded');
  } else {
    sidebar.classList.remove('collapsed');
    main.classList.remove('expanded');
  }
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════
function statusBadge(status) {
  const colors = {
    'Approved': 'var(--success)', 'Rejected': 'var(--danger)', 'Pending': 'var(--warning)'
  };
  return `<span class="badge" style="background:${colors[status]}20;color:${colors[status]};border:1px solid ${colors[status]}40">${status}</span>`;
}

async function renderDashboard(container) {
  try {
    const data = await DB.getDashboardData();
    const { stats, todayUploads, todayUpdated, trend, performance } = data;
    const total = parseInt(stats.total) || 0;
    const pendingPct = total ? Math.round((stats.pending / total) * 100) : 0;
    const appPct = total ? Math.round((stats.approved / total) * 100) : 0;

    container.innerHTML = `
      <div class="fade-in">
        <div class="stats-grid">
          <div class="stat-card stat-primary">
            <div class="stat-title">Total Customers</div>
            <div class="stat-value">${total}</div>
            <div class="stat-trend">All time records</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Pending Status</div>
            <div class="stat-value" style="color:var(--warning)">${stats.pending}</div>
            <div class="stat-trend">${pendingPct}% of total</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Approved Status</div>
            <div class="stat-value" style="color:var(--success)">${stats.approved}</div>
            <div class="stat-trend">${appPct}% of total</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Today's Activity</div>
            <div class="stat-value" style="color:var(--primary-light)">${todayUploads}</div>
            <div class="stat-trend">${todayUpdated} records updated today</div>
          </div>
        </div>
        <div class="chart-grid">
          <div class="card"><div class="card-header"><span class="card-title">📈 Upload Trend (7 Days)</span></div><div class="chart-container"><canvas id="trendChart"></canvas></div></div>
          <div class="card"><div class="card-header"><span class="card-title">📊 Status Distribution</span></div><div class="chart-container"><canvas id="statusChart"></canvas></div></div>
        </div>
      </div>`;

    setTimeout(() => {
      // Trend Chart
      new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: {
          labels: trend.map(t => t.label),
          datasets: [{ label: 'Uploads', data: trend.map(t => t.count), borderColor: '#818cf8', backgroundColor: 'rgba(129, 140, 248, 0.1)', borderWidth: 3, tension: 0.4, fill: true, pointBackgroundColor: '#818cf8' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
      });
      // Status Chart
      new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
          labels: ['Approved', 'Rejected', 'Pending'],
          datasets: [{ data: [stats.approved, stats.rejected, stats.pending], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20, usePointStyle: true } } } }
      });
    }, 50);
  } catch (err) {
    container.innerHTML = `<div class="empty-state">Error loading dashboard: ${err.message}</div>`;
  }
}

// Session sync
function saveSession() {
  if (State.currentEmployee) sessionStorage.setItem('rm_employee', JSON.stringify(State.currentEmployee));
  else sessionStorage.removeItem('rm_employee');
}

document.addEventListener('DOMContentLoaded', () => {
  const savedEmp = sessionStorage.getItem('rm_employee');
  if (savedEmp) {
    try { State.currentEmployee = JSON.parse(savedEmp); renderApp(); return; } catch { sessionStorage.removeItem('rm_employee'); }
  }
  renderEmployeeSelect();
});
