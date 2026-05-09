# RM Team Customer Tracker

**Professional Customer Status Tracking & Excel Upload Management System**

---

## 📁 File Structure

```
RM-Tracker/
├── index.html          ← Open this in any browser
├── assets/
│   ├── style.css       ← All styles (dark theme, responsive)
│   ├── db.js           ← Data layer (localStorage / upgrade to PostgreSQL)
│   ├── app.js          ← Core logic: state, toast, dashboard, shell
│   └── app2.js         ← Pages: Upload, Customers, Logs, Admin + Boot
```

---

## 🚀 How to Use

1. **Double-click** `index.html` to open in Chrome/Edge/Firefox
2. Select your employee name from the dropdown → Click **Continue**
3. Upload your daily `.xlsx` file via the **Upload Excel** page
4. View and filter all customers in the **Customers** page
5. Export filtered data to Excel with one click

### Admin Panel
- On the login screen, click **"Open Admin Panel"**
- Add, edit, remove, activate/deactivate employees
- View upload logs and employee-wise performance

---

## 📊 Excel Format Required

| Column A      | Column B   | Column C |
|---------------|------------|----------|
| Customer Name | PAN Card   | Status   |
| Rahul Sharma  | ABCDE1234F | Approved |

**Supported Status Values:** `Approved`, `Rejected`, `Pending`

**File type:** `.xlsx` only | **Max size:** 5 MB

---

## ⚙️ Key Features

| Feature | Details |
|---------|---------|
| PAN as unique key | Upserts records — no duplicates ever created |
| Duplicate in same file | Last row kept, warnings shown |
| PAN validation | Must match `ABCDE1234F` format (5 letters + 4 digits + 1 letter) |
| Export to Excel | Filter by date, status, employee before exporting |
| Dashboard charts | Daily upload trend + Status distribution (Chart.js) |
| Pagination | 15 records per page in Customers, 20 in Logs |
| Session persistence | Stays logged in on page refresh (session storage) |
| Responsive | Works on mobile, tablet, and desktop |

---

## 🔮 Future Upgrade Path (Backend Ready)

The `db.js` file is the **only file** you need to modify to switch from localStorage to a real database. Every function there maps 1:1 to a REST API endpoint:

```
DB.employees.getAll()       → GET  /api/employees
DB.employees.add(name)      → POST /api/employees
DB.customers.getAll(filters)→ GET  /api/customers?search=&status=
DB.customers.upsert(record) → POST /api/customers/upsert
DB.processUpload(rows, by)  → POST /api/upload
DB.exportToExcel(filters)   → GET  /api/export
```

### Recommended Backend Stack
- **Runtime:** Node.js + Express.js
- **Database:** PostgreSQL with `pg` library
- **Excel parsing:** `xlsx` npm package (SheetJS)
- **ORM (optional):** Prisma or Sequelize

### PostgreSQL Schema
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(100) UNIQUE NOT NULL,
  active_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(200) NOT NULL,
  pan_card VARCHAR(10) UNIQUE NOT NULL,
  status VARCHAR(20) CHECK (status IN ('Approved','Rejected','Pending')),
  uploaded_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_customers_pan ON customers(pan_card);
CREATE INDEX idx_customers_status ON customers(status);

CREATE TABLE upload_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(100),
  upload_date TIMESTAMPTZ DEFAULT now(),
  total_rows INT DEFAULT 0,
  created_records INT DEFAULT 0,
  updated_records INT DEFAULT 0,
  duplicate_records INT DEFAULT 0,
  failed_records INT DEFAULT 0
);
```

---

## 🔒 Security (when backend is added)
- PAN format regex validated on both client and server
- File type + size validated before parsing
- Parameterized queries prevent SQL injection
- Input sanitization on all text fields

---

*Built for RM Team — May 2026*
