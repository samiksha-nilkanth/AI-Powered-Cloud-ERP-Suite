# Amdox ERP Suite — AI-Powered Cloud ERP

<div align="center">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-success" alt="Status" />
  <img src="https://img.shields.io/badge/Architecture-Modular%20Monolith-blue" alt="Architecture" />
  <img src="https://img.shields.io/badge/License-Confidential-red" alt="License" />
</div>

> Enterprise AI-Powered Resource Planning Platform  
> Project Code: **AMX-ERP-2026-04** | Amdox Technologies

## 🌟 Overview

The **Amdox ERP Suite** is a scalable, cloud-native ERP platform that consolidates fragmented enterprise workflows into a single intelligent system. Built with modern web technologies, it features a glassmorphism design system, strict role-based access control, and a suite of interconnected enterprise modules.

### ✨ Key Features
- **Strict Role-Based Access Control (RBAC)**: Users are bound to specific module dashboards. Only users with the `super_admin` role can bypass module restrictions.
- **Financial Ledger**: General Ledger, AP/AR Automation, Multi-Currency Management, and Period Close tracking.
- **HR & Payroll Engine**: Employee Directory, Leave Management, Payroll Processing, and Compliance.
- **Supply Chain**: Inventory Management, PO Lifecycle, Vendor Portal, and Reorder Automation.
- **Project Management**: Active Projects, Gantt Timeline Visualization, Resource Allocation, and Budget Tracking.
- **AI Forecasting & Analytics**: Predictive dashboards for revenue forecasting and resource planning.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git

### 1. Backend Setup
The backend runs on an Express.js server backed by an embedded SQLite database.
```bash
cd backend
npm install
npm run dev
```
*Backend API starts at:* `http://localhost:5000`

### 2. Frontend Setup
The frontend is a vanilla JavaScript single-page application structure. You can run it using any static server.
```bash
cd frontend
npx serve -p 3000
```
*Frontend accessible at:* `http://localhost:3000`

---

## 🔑 Default Accounts

For development and testing purposes, the database is seeded with a master admin account:

- **Email:** `admin@amdox.in`
- **Password:** `12345`
- **Role:** `super_admin` (Full cross-module access)

You can also register a standard account via the `/register.html` page. Standard users will be restricted to the specific dashboard module they select upon login.

---

## 📁 Project Architecture

```
amdox/
├── frontend/                 # Client-side application
│   ├── index.html           # Guest landing / Module selector
│   ├── login.html           # Role-specific login
│   ├── dashboard.html       # Primary unified dashboard
│   ├── hr.html              # HR & Payroll module
│   ├── finance.html         # Financial Ledger module
│   ├── supply.html          # Supply Chain module
│   ├── projects.html        # Project Management module
│   ├── forecast.html        # AI Forecasting module
│   ├── analytics.html       # Business Intelligence
│   ├── css/
│   │   └── styles.css       # Core Design System (Glassmorphism)
│   └── js/
│       ├── app.js           # Auth guards & UI utilities
│       └── login.js         # Session management
│
├── backend/                  # Server-side API
│   ├── server.js            # Express entry point
│   ├── config/
│   │   └── database.js      # SQLite connection & seed logic
│   ├── middleware/
│   │   └── auth.js          # JWT & RBAC guards
│   ├── routes/
│   │   ├── auth.js          # Authentication (Login/Register)
│   │   ├── hr.js            # HR endpoints
│   │   ├── finance.js       # Finance endpoints
│   │   ├── projects.js      # Project endpoints
│   │   └── supply.js        # Inventory endpoints
│   └── database/
│       ├── schema.sql       # Enterprise SQL table schemas
│       └── amdox_erp.db     # Local SQLite database
│
└── README.md
```

## 🛡️ Security Features
- **JWT Authentication**: Secure access and refresh token rotation.
- **Bcrypt Hashing**: 12-round salt hashing for all user credentials.
- **CORS & Helmet**: Strict cross-origin policies and security headers.
- **Route Guards**: Frontend and Backend API route protection ensuring tenant/role isolation.

---

*Amdox Technologies • Engineering Division • April 2026*
