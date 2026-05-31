-- ============================================================
-- AMDOX ERP Suite - Database Schema
-- Module: Authentication & User Management
-- Version: 1.0 | April 2026
-- ============================================================

-- Tenants table (multi-tenant ready as per F-01 spec)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT UNIQUE,
    settings TEXT DEFAULT '{}',  -- JSON config per tenant
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table (core identity)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    tenant_id TEXT DEFAULT 'default',
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT DEFAULT 'viewer' CHECK(role IN ('super_admin', 'tenant_admin', 'manager', 'viewer')),
    provider TEXT DEFAULT 'local' CHECK(provider IN ('local', 'google', 'phone')),
    google_id TEXT UNIQUE,
    mfa_enabled INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- OTP codes for phone authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions for refresh token tracking
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    refresh_token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    is_revoked INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit logs (immutable, append-only as per F-09 spec)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    tenant_id TEXT DEFAULT 'default',
    action TEXT NOT NULL,
    resource TEXT,
    details TEXT,  -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- Seed default tenant
INSERT OR IGNORE INTO tenants (id, name, domain) VALUES ('default', 'Amdox Technologies', 'amdox.com');

-- Employees Table (HR & Payroll)
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employee_code TEXT UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    department TEXT NOT NULL,
    position TEXT NOT NULL,
    salary REAL DEFAULT 0,
    hire_date DATE,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Transactions Table (Finance Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    amount REAL DEFAULT 0,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects Table (Project Management)
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT,
    status TEXT DEFAULT 'planning',
    start_date DATE,
    end_date DATE,
    budget REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks Table (Project Management)
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    assignee TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Inventory Items Table (Supply Chain)
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit_price REAL DEFAULT 0,
    supplier TEXT,
    status TEXT DEFAULT 'in_stock',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
