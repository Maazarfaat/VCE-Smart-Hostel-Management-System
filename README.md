# Smart Hostel Management System (SHMS)
### Vardhaman College of Engineering (VCE) Boys Hostel 2026-27

A complete, enterprise-grade, role-based Smart Hostel Management System built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, **Node.js**, **Express**, **Prisma ORM**, and **MySQL**.

---

## 🏛️ System Overview

The Smart Hostel Management System (SHMS) manages the residential operations of the **VCE Boys Hostel**, including the ingestion and management of the **466 student residents** across 5 academic cohorts (`1st Year`, `2nd Year`, `3rd Year`, `4th Year`, and `MBA`) from the workbook `VCE BOYS HOSTEL LIST 2026-27.xlsx`.

---

## 🚀 Key Modules Built

1. **Dashboard:**
   - Real-time role-tailored telemetry: bed occupancy percentage, active student counts, fee collections, outstanding dues, open complaints, gate pass telemetry, and active guests in the hostel lounge.
2. **Authentication & User Management:**
   - Secure password hashing (`bcrypt`), JWT sessions with role claims, and backend-enforced RBAC.
   - User administration for staff accounts (Admin, Warden, Maintenance, Security).
3. **Student Management:**
   - Search by roll number, name, or branch; filter by academic year of study, branch, room number, or status.
   - Complete student dossiers showing personal information, room & bed allocations, fee ledger, and pass history.
4. **Room & Bed Management:**
   - Blocks, rooms, and bed slot mapping with real-time occupancy.
   - Atomic bed allocation transactions (prevents duplicate active allocations).
   - Student room transfers.
   - **Vacating protection:** Strictly validates and prevents vacating if a student has any outstanding fee dues.
5. **Complaint & Maintenance Management:**
   - Ticketing workflow: raise complaints, assign to maintenance specialists, update status (`Open` → `In Progress` → `Resolved` → `Closed`), attach resolution notes, and reopen if unresolved.
6. **Fee Management:**
   - Annual fee structures, partial and full payment recording (Cash, Bank Transfer, Cheque, DD).
   - **Balance protection:** Rejects payment amounts exceeding the outstanding balance.
   - Generates unique sequential receipt numbers (`REC-YYYY-XXXXX`) and printable official payment receipts with college headers and seals.
7. **Leave & Outing Gate Pass Management:**
   - Student application (Local Outing, Home Leave, Emergency).
   - Warden approval generating cryptographically randomized 6-digit gate pass codes (`OUT-XXXXXX`).
   - Security Gate Terminal: scan/verify code or roll number at exit and entry.
   - **Late return tracking:** Automatically flags late returns past the expected return hour and records late minutes for disciplinary review.
8. **Visitor Management:**
   - Parent and guardian guest registration with ID proof capture.
   - Visiting hours validation (09:00 AM – 06:30 PM) with warning flags for visits outside standard hours.
   - Real-time active guest register and departure checkout logging.
9. **Notifications & Analytics Reports:**
   - Announcements board and in-app alerts.
   - Comprehensive reports: Occupancy analytics, floor breakdown, fee collections & dues register, maintenance turnaround times, and gate infraction logs.
   - Printable / exportable reports.

---

## 🛡️ User Roles & Demo Accounts

The system provides 5 distinct roles enforced through backend middleware:

| Role | Username | Password | Key Responsibilities |
| :--- | :--- | :--- | :--- |
| **Hostel Administrator** | `admin` | `AdminPassword@123` | Full system control, Excel batch import, fee structures, user management. |
| **Chief Warden** | `warden` | `WardenPassword@123` | Room allocations, room transfers, leave/outing approvals, complaints oversight. |
| **Student Resident** | `student` *(or roll `26881A0588`)* | `StudentPassword@123` | Personal room & bed details, roommate info, gate pass requests, complaints, fees & receipts. |
| **Maintenance Staff** | `maintenance` | `MaintPassword@123` | Assigned workorders, ticket progress updates, repair resolution notes. |
| **Security Guard** | `security` | `SecurityPassword@123` | Main gate pass code verification, exit/entry stamping, late tracking, visitor register. |

> **Tip:** The Login page includes **1-Click Demo Login** buttons to switch between all 5 role perspectives instantly.

---

## 📊 Excel Import Architecture (`VCE BOYS HOSTEL LIST 2026-27.xlsx`)

The administrator Excel import engine reads the workbook and its 5 sheets:
1. `1ST YEAR` (193 students)
2. `2ND YEAR` (167 students)
3. `3RD YEAR` (97 students)
4. `4TH YEAR` (8 students)
5. `MBA` (1 student)

### Key Features of the Importer:
- **Merged Cell & Forward-Fill Handling:** In the original workbook, room numbers (e.g. `101`, `201`, `301`) span multiple students sharing that room. The parser forward-fills the active room number so all roommates are assigned correctly.
- **Column Validation:** Verifies required columns (`S.NO`, `ROOM NO`, `ROLL NUMBER`, `NAME`, `BRANCH`).
- **Duplicate Roll-Number Detection:** Detects duplicate rolls inside the file and existing rolls in the database.
- **Preview Before Ingestion:** Returns sheet-by-sheet breakdowns and sample tables without modifying the database.
- **Atomic Batch Ingestion:** Executes inside an idempotent transaction: creates Blocks, Rooms (100 distinct rooms), Student profiles (466 authentic records), Active Allocations, and Student Fee records with honest unconstrained capacity preservation.

---

## 🛠️ Technology Stack

- **Frontend:**
  - React 19
  - Vite 6
  - TypeScript
  - Tailwind CSS 3
  - Lucide React (Icons)
  - Axios
- **Backend:**
  - Node.js (v24+) & Express 4
  - TypeScript
  - Prisma ORM 6
  - Zod (Schema & Runtime Validation)
  - bcryptjs (Password Hashing)
  - jsonwebtoken (JWT Auth)
  - SheetJS `xlsx` (Excel Processing)
  - Multer (Multipart Form Handling)
- **Database:**
  - MySQL Server 8.0 / MySQL Community Server

---

## ⚡ Setup & Installation

### 1. Prerequisites
- **Node.js**: v18+ (verified on v24.12.0)
- **npm**: v10+ (verified on 11.6.2)
- **MySQL Server 8.0**: Installed and running (service `MySQL80`)

### 2. Install Dependencies
From the root project folder:
```bash
npm install
cd server && npm install
cd ../client && npm install
cd ..
```
*(Or run `npm run install:all`)*

### 3. Database Configuration (MySQL)
Configure `server/.env` with your MySQL credentials:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/smart_hostel_db"
JWT_SECRET="smart_hostel_vce_super_secret_jwt_key_2026_shms"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
EXCEL_FILE_PATH="../VCE BOYS HOSTEL  LIST 2026-27.xlsx"
```

### 4. Push Schema & Seed Initial Data
Run the automated initialization script:
```bash
npm run db:setup
```
Or run the Prisma commands directly:
```bash
cd server
npx prisma generate
npx prisma db push
npm run seed
```

This provisions:
- All database tables and foreign keys
- The 5 default demo accounts (`admin`, `warden`, `student`, `maintenance`, `security`)
- Default residential blocks, sample rooms, bed configurations, fee structures, sample complaints, outings, and announcements.

### 5. Running the Application
To run both the backend server (port 5000) and frontend client (port 5173) simultaneously:
```bash
npm run dev
```
- **Frontend URL:** `http://localhost:5173`
- **Backend API URL:** `http://localhost:5000/api`
- **Health Check:** `http://localhost:5000/api/health`

### 6. Running Tests & Build Verification
```bash
# Run unit & integration test suite (Vitest)
npm test

# Run production build checks (TypeScript + Vite)
npm run build
```

---

## 📁 Project Structure

```
SE-CEP/
├── package.json               # Root workspace scripts (dev, build, test, setup)
├── .env.example               # Template environment configuration
├── .gitignore                 # Git ignore rules
├── README.md                  # System manual and documentation
├── VCE BOYS HOSTEL  LIST 2026-27.xlsx # Original hostel residents dataset
│
├── server/                    # Node.js + Express + Prisma backend
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env                   # Server environment configuration
│   ├── prisma/
│   │   ├── schema.prisma      # 14 relational models & enums
│   │   └── seed.ts            # Development seed data for all 5 roles
│   ├── scripts/
│   │   └── init-db.js         # Automated DB push & seed script
│   └── src/
│       ├── index.ts           # Express server setup & router mounts
│       ├── config/            # Env and role configuration
│       ├── types/             # Backend TypeScript interfaces
│       ├── lib/prisma.ts      # Prisma client singleton
│       ├── utils/             # JWT, bcrypt, and API response helpers
│       ├── middlewares/       # Auth JWT verification & RBAC guards
│       ├── services/
│       │   └── excelService.ts # Excel parser, validation & batch importer
│       ├── controllers/       # Business logic controllers for all 9 modules
│       ├── routes/            # Express routers
│       └── __tests__/         # Vitest test suite
│
└── client/                    # React + Vite + TypeScript frontend
    ├── package.json
    ├── vite.config.ts         # Vite bundler config with /api proxy
    ├── tailwind.config.js     # Tailwind CSS theme tokens
    ├── index.html             # Application shell & Inter typography
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main application layout & router
        ├── index.css          # Tailwind directives & print styles
        ├── types/             # Frontend interfaces
        ├── api/client.ts      # Axios client with JWT interceptor
        ├── context/           # AuthContext & role session management
        ├── components/        # Reusable UI components (Navbar, Sidebar, Modal, Badges, StatCards, Receipts)
        └── pages/             # 11 Module pages (Login, Dashboard, Students, ExcelImport, Rooms, Complaints, Fees, Outings, Visitors, Reports, Users)
```
