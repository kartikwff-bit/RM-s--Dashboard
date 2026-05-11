-- ============================================================
-- RM Tracker — PostgreSQL Database Schema
-- Run this file ONCE to create all tables
-- Compatible with PostgreSQL 13+
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Employees Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(100) NOT NULL,
  password    VARCHAR(255) NOT NULL DEFAULT '1234',
  active_status BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employees_name_unique UNIQUE (employee_name)
);

-- ── Customers Table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(200) NOT NULL,
  pan_card      VARCHAR(10)  NOT NULL,
  status        VARCHAR(20)  NOT NULL CHECK (status IN ('Approved', 'Rejected', 'Pending')),
  uploaded_by   VARCHAR(100),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT customers_pan_unique UNIQUE (pan_card)
);

-- Index for fast PAN searches
CREATE INDEX IF NOT EXISTS idx_customers_pan    ON customers(pan_card);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_emp    ON customers(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_customers_upd    ON customers(updated_at);

-- ── Upload Logs Table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS upload_logs (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name     VARCHAR(100),
  upload_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_rows        INT NOT NULL DEFAULT 0,
  created_records   INT NOT NULL DEFAULT 0,
  updated_records   INT NOT NULL DEFAULT 0,
  duplicate_records INT NOT NULL DEFAULT 0,
  failed_records    INT NOT NULL DEFAULT 0
);

-- ── Settings Table (for admin password, etc.) ────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default admin password
INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')
  ON CONFLICT (key) DO NOTHING;

-- ── Seed sample employees ─────────────────────────────────────────────────────
INSERT INTO employees (employee_name, password) VALUES
  ('Amit Sharma',  '1234'),
  ('Priya Patel',  '1234'),
  ('Rahul Verma',  '1234'),
  ('Sneha Joshi',  '1234')
ON CONFLICT (employee_name) DO NOTHING;
