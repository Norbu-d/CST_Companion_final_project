# Campus Companion — Full Project Progress & Handoff

> Use this file to resume work in a new Claude chat. Paste the entire contents and say:
> **"Continue building my Campus Companion project. Here is the full context:"**

---

## 1. Project Overview & Goal

**Project Name:** Campus Companion — Full Stack System (Mobile App + Backend API + Admin Dashboard)
**Purpose:** A complete digital companion platform for students, lecturers, and administrators at CST (College of Science and Technology), Rinchending, Phuentsholing, Royal University of Bhutan.
**Assignment:** SWE201 – Cross Platform Development | Programming Assignment 1 | Year 3, Semester 2

### Three interconnected parts:

**1. Campus Companion Mobile App (Expo / React Native) ✅ Complete**
Students can log in, view contacts, check notices, browse and book facilities, and track bookings. Lecturers can mark themselves as on leave. Role-based navigation shows different tabs per user type.

**2. Campus Companion Backend (Node.js / Hono REST API) ✅ Complete**
Handles all authentication via JWT, stores data in PostgreSQL, enforces first-come-first-served booking conflicts, manages lecturer leave, and exposes admin-only endpoints. Three user roles: STUDENT, LECTURER, ADMIN.

**3. Campus Companion Admin Dashboard (Vite + React) ✅ Complete**
Web-based internal tool for admins. Handles booking approvals/rejections, notice publishing, lecturer leave oversight, and facility overview. Runs at http://localhost:5173.

---

## 2. Design Language

### Mobile App
- Primary: `#1A3C6E` (deep navy blue — CST brand)
- Accent: `#F4A623` (warm gold)
- Background: `#F1F3F7`
- All styling via `StyleSheet.create()` — zero inline styles
- Centralized design tokens in `src/theme/theme.js`

### Admin Dashboard
- Matches mobile brand exactly: navy `#1A3C6E` + gold `#F4A623`
- Fonts: `DM Serif Display` (headings) + `DM Sans` (body)
- Fixed sidebar (260px) with gold glow accent, dark navy background
- Stat cards with color-coded top border strips
- Smooth hover transitions, modal overlays with blur backdrop
- All CSS via custom design system in `src/index.css` (CSS variables)

---

## 3. Tech Stack

### Mobile App (Expo SDK 55)
| Tool | Version | Purpose |
|---|---|---|
| Expo | ~55.0.0 | Build and run framework |
| React Native | latest for SDK 55 | Core mobile framework |
| @react-navigation/native | ^7.x | Navigation container |
| @react-navigation/stack | ^7.x | Stack navigator |
| @react-navigation/bottom-tabs | ^7.x | Bottom tab navigator |
| expo-linear-gradient | SDK 55 compat | Gradient hero banners |
| @expo/vector-icons (Ionicons) | ^15.x | Icons |
| @react-native-async-storage/async-storage | 2.2.0 | JWT token storage |
| react-native-safe-area-context | SDK 55 compat | SafeAreaProvider at root only |

> ⚠️ Project was upgraded from SDK 54 to SDK 55 to match Expo Go on device.
> Run `npx expo install expo@~55.0.0 --fix` if dependencies need re-aligning.

### Backend (Node.js)
| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Hono | ^4.x | Web framework |
| @hono/node-server | ^1.x | Run Hono on Node.js |
| Prisma | ^7.x | ORM |
| @prisma/adapter-pg | ^7.x | Required Prisma 7 driver adapter |
| pg | ^8.x | PostgreSQL driver |
| PostgreSQL | 15+ | Database |
| jsonwebtoken | ^9.x | JWT auth |
| bcryptjs | ^2.x | Password hashing |
| zod | ^3.x | Validation |
| dotenv | ^16.x | Environment variables |
| nodemon | ^3.x | Dev auto-restart |

> ⚠️ Prisma 7: `url` lives in `prisma.config.js`, NOT in `schema.prisma`. Must use `@prisma/adapter-pg`.

### Admin Dashboard (Vite + React)
| Tool | Version | Purpose |
|---|---|---|
| Vite | ^6.x | Build tool and dev server |
| React | ^18.x | UI framework |
| React Router v6 | ^6.28.x | Client-side routing |
| Axios | ^1.7.x | HTTP calls to backend |
| TanStack Query | ^5.x | Server state + caching |
| lucide-react | ^0.468.x | Icons |
| date-fns | ^4.x | Date formatting |

---

## 4. User Roles

| Role | Can Do |
|---|---|
| `STUDENT` | Login, view contacts/notices/schedule, book facilities, view own bookings, see who booked each slot |
| `LECTURER` | Login, view contacts/notices, mark themselves on leave (date range + reason), cancel own leave. **No schedule tab.** |
| `ADMIN` | Everything above + approve/reject bookings, create/edit/delete notices, view all bookings, manage lecturer leave |

**Important rules:**
- Only **ADMIN** can send/create notices — students and lecturers can only read them
- Only **STUDENTS** can make facility bookings — lecturers and admins cannot
- Booking is **first-come-first-served** — a PENDING booking locks the slot immediately, no double-booking
- Students can see **who booked** each slot on the booking screen
- Schedule tab is **students only** — lecturers do not have it
- **Contacts = Lecturers** — the Contact table has been removed. `GET /contacts` now queries the `User` table for `role = LECTURER`. Students and lecturers can both see all lecturers and their on-leave status.

---

## 5. Database Schema (Prisma)

> ⚠️ The `Contact` model has been **removed**. Contacts are now served directly from the `User` table filtered by `role = LECTURER`. Run `npx prisma migrate dev --name remove_contact_table` after updating schema.

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
}

model User {
  id             Int              @id @default(autoincrement())
  studentId      String           @unique   // reused as employeeId for lecturers
  name           String
  email          String           @unique
  password       String
  role           Role             @default(STUDENT)
  contact        String?          // phone number
  department     String?
  year           String?
  createdAt      DateTime         @default(now())
  bookings       Booking[]
  lecturerLeaves LecturerLeave[]
}

model Schedule {
  id      Int    @id @default(autoincrement())
  day     String
  time    String
  subject String
  room    String
  type    String
}

model Notice {
  id       Int      @id @default(autoincrement())
  title    String
  body     String
  category String
  pinned   Boolean  @default(false)
  icon     String   @default("megaphone")
  date     DateTime @default(now())
}

model Facility {
  id          Int       @id @default(autoincrement())
  facilityKey String    @unique
  name        String
  description String
  capacity    Int
  location    String
  color       String
  icon        String
  rules       String[]
  bookings    Booking[]
}

model Booking {
  id         Int           @id @default(autoincrement())
  userId     Int
  facilityId Int
  date       String
  slots      Int[]
  purpose    String
  status     BookingStatus @default(PENDING)
  createdAt  DateTime      @default(now())
  facility   Facility      @relation(fields: [facilityId], references: [id])
  user       User          @relation(fields: [userId], references: [id])
}

model LecturerLeave {
  id        Int      @id @default(autoincrement())
  userId    Int
  startDate DateTime
  endDate   DateTime
  reason    String?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

enum Role {
  STUDENT
  LECTURER
  ADMIN
}

enum BookingStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**After any schema change run:**
```bash
npx prisma migrate dev --name describe_what_changed
```

---

## 6. Backend File Structure

```
campus-companion-backend/
├── prisma/
│   ├── schema.prisma              ← All DB models (Contact model REMOVED)
│   ├── prisma.config.js           ← Prisma 7 config (DATABASE_URL lives here)
│   ├── seed.js                    ← Seeds admin + student + lecturer + schedule + notices + facilities
│   ├── fix-passwords.js           ← One-off: re-hashes all passwords from studentId
│   ├── import-students.js         ← Bulk import students from CSV (leading-zero safe)
│   ├── import-lecturers.js        ← Bulk import lecturers from CSV (role = LECTURER)
│   ├── import-facilities.js
│   ├── import-notices.js
│   └── data/
│       ├── students.csv           ← 25 dummy students (gitignored in real deploy)
│       └── lecturers.csv          ← 8 dummy lecturers — these are also the contacts
├── src/
│   ├── index.js                   ← Entry point, all routes mounted + CORS config
│   ├── db.js                      ← Prisma + pg adapter singleton
│   ├── middleware/
│   │   ├── auth.js                ← authMiddleware + adminMiddleware + lecturerMiddleware
│   │   └── errorHandler.js        ← Global Zod + general error handler
│   ├── routes/
│   │   ├── auth.js                ← POST /auth/login (email OR studentId)
│   │   ├── contacts.js            ← GET /contacts, GET /contacts/:id — queries User WHERE role=LECTURER
│   │   ├── schedule.js            ← GET /schedule (pending — not priority)
│   │   ├── notices.js             ← GET /notices + admin POST/PATCH/DELETE
│   │   ├── facilities.js          ← GET /facilities, GET /facilities/:key
│   │   ├── bookings.js            ← Full booking routes (FCFS, booker name on slots)
│   │   └── lecturer.js            ← Lecturer leave routes
│   └── validators/
│       ├── auth.validator.js      ← loginSchema accepts email OR studentId
│       └── booking.validator.js
├── .env
├── .env.example
└── package.json
```

---

## 7. Backend API Reference

### Auth (no JWT required)
| Method | Route | Description |
|---|---|---|
| POST | `/auth/login` | Login → returns JWT + user object |

### Student routes (JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/contacts` | All lecturers as contacts (`?search=`) |
| GET | `/contacts/:id` | Single lecturer contact |
| GET | `/schedule` | Timetable (`?day=Monday`) — pending feature |
| GET | `/notices` | All notices (`?category=Exam`) |
| GET | `/facilities` | All facilities |
| GET | `/facilities/:key` | Single facility |
| GET | `/bookings/my` | Current user's bookings |
| GET | `/bookings/slots?facilityId=&date=` | Returns `slotMap` — slot index → `{ bookedBy, status }` |
| POST | `/bookings` | Create booking (FCFS conflict check, students only) |

### Admin routes (JWT + ADMIN role)
| Method | Route | Description |
|---|---|---|
| GET | `/bookings/all` | All bookings with user + facility |
| PATCH | `/bookings/:id/status` | Approve or reject a booking |
| POST | `/notices` | Create a notice |
| PATCH | `/notices/:id` | Edit a notice |
| DELETE | `/notices/:id` | Delete a notice |

### Lecturer leave routes (JWT required)
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/lecturer/on-leave` | All roles | All lecturers currently on leave today |
| GET | `/lecturer/:userId/leave` | All roles | Specific lecturer's leave history |
| POST | `/lecturer/leave` | LECTURER + ADMIN | Submit a leave date range |
| DELETE | `/lecturer/leave/:id` | LECTURER (own) + ADMIN | Cancel a leave record |

### API response format
```json
{ "success": true,  "data": { ... } }
{ "success": false, "message": "..." }
```

---

## 8. Backend Key Files

### `src/routes/contacts.js` — UPDATED (queries User table, not Contact table)
```js
const { Hono } = require('hono');
const prisma = require('../db');
const router = new Hono();

// GET /contacts — returns all LECTURER users shaped as contacts
router.get('/', async (c) => {
  try {
    const search = c.req.query('search');
    const where = { role: 'LECTURER' };
    if (search) {
      const q = search.toLowerCase();
      where.AND = {
        OR: [
          { name:       { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
        ],
      };
    }
    const lecturers = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, contact: true, department: true },
      orderBy: { name: 'asc' },
    });
    const data = lecturers.map(l => ({
      id:          l.id,
      name:        l.name,
      role:        'Lecturer',
      phone:       l.contact ?? 'N/A',
      email:       l.email,
      department:  l.department ?? 'CST',
      officeHours: 'Mon–Fri, 9:00–17:00',
    }));
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({ success: false, message: 'Failed to fetch contacts' }, 500);
  }
});

// GET /contacts/:id — returns single lecturer by User id
router.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const lecturer = await prisma.user.findFirst({
      where: { id, role: 'LECTURER' },
      select: { id: true, name: true, email: true, contact: true, department: true },
    });
    if (!lecturer) return c.json({ success: false, message: 'Contact not found' }, 404);
    const data = {
      id: lecturer.id, name: lecturer.name, role: 'Lecturer',
      phone: lecturer.contact ?? 'N/A', email: lecturer.email,
      department: lecturer.department ?? 'CST', officeHours: 'Mon–Fri, 9:00–17:00',
    };
    return c.json({ success: true, data });
  } catch (err) {
    return c.json({ success: false, message: 'Failed to fetch contact' }, 500);
  }
});

module.exports = router;
```

### `src/index.js` — FINAL VERSION (with CORS fix for admin dashboard)
```js
require('dotenv').config();
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const { logger } = require('hono/logger');

const authRoutes     = require('./routes/auth');
const contactRoutes  = require('./routes/contacts');
const scheduleRoutes = require('./routes/schedule');
const noticeRoutes   = require('./routes/notices');
const facilityRoutes = require('./routes/facilities');
const bookingRoutes  = require('./routes/bookings');
const lecturerRoutes = require('./routes/lecturer');
const errorHandler   = require('./middleware/errorHandler');

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3001', 'http://localhost:8081', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.get('/', (c) => c.json({ success: true, message: 'Campus Companion API is running 🎓' }));

app.route('/auth',      authRoutes);
app.route('/contacts',  contactRoutes);
app.route('/schedule',  scheduleRoutes);
app.route('/notices',   noticeRoutes);
app.route('/facilities',facilityRoutes);
app.route('/bookings',  bookingRoutes);
app.route('/lecturer',  lecturerRoutes);

app.onError(errorHandler);
app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));

const PORT = process.env.PORT || 3000;
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 Campus Companion API running at http://localhost:${PORT}`);
});
```

### `prisma/seed.js` — FINAL VERSION (admin + student + lecturer + schedule + notices + facilities)
```js
const prisma = require('../src/db');
const bcrypt = require('bcryptjs');

async function main() {
  await prisma.user.upsert({
    where: { email: 'admin@cst.edu.bt' },
    update: {},
    create: { studentId: 'ADMIN001', name: 'CST Admin', email: 'admin@cst.edu.bt', password: await bcrypt.hash('admin123', 10), role: 'ADMIN' },
  });
  await prisma.user.upsert({
    where: { email: 'student@cst.edu.bt' },
    update: {},
    create: { studentId: 'STD220001', name: 'Tenzin Dorji', email: 'student@cst.edu.bt', password: await bcrypt.hash('student123', 10), role: 'STUDENT' },
  });
  await prisma.user.upsert({
    where: { email: 'lecturer@cst.edu.bt' },
    update: {},
    create: { studentId: 'L001', name: 'Sonam Tshering', email: 'lecturer@cst.edu.bt', password: await bcrypt.hash('lecturer123', 10), role: 'LECTURER', department: 'Computer Science', contact: '+975-5-336402' },
  });
  // + schedule, notices, facilities (see full seed.js file)
}
main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

### `prisma/prisma.config.js`
```js
require('dotenv').config();
const { defineConfig } = require('prisma/config');
module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'node prisma/seed.js' },
  datasource: { url: process.env.DATABASE_URL },
});
```

### `src/db.js`
```js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
module.exports = prisma;
```

### `src/middleware/auth.js`
```js
const jwt = require('jsonwebtoken');

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    c.set('user', decoded);
    await next();
  } catch (err) {
    return c.json({ success: false, message: 'Unauthorized: Invalid token' }, 401);
  }
};

const adminMiddleware = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'ADMIN')
    return c.json({ success: false, message: 'Forbidden: Admins only' }, 403);
  await next();
};

const lecturerMiddleware = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'LECTURER' && user?.role !== 'ADMIN')
    return c.json({ success: false, message: 'Forbidden: Lecturers only' }, 403);
  await next();
};

module.exports = { authMiddleware, adminMiddleware, lecturerMiddleware };
```

### `.env`
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/campus_companion"
JWT_SECRET="cst_rub_campus_companion_secret_2026"
JWT_EXPIRES_IN="7d"
PORT=3000
```

### Key route notes

**`src/routes/bookings.js`**
- `GET /slots` returns `slotMap`: `{ [slotIndex]: { bookedBy: string, status: string } }`
- `POST /` blocks if any slot is PENDING or APPROVED (FCFS — pending counts as taken)
- `POST /` restricted to STUDENT role only

**`src/routes/notices.js`**
- `GET /` — all roles can read
- `POST /`, `PATCH /:id`, `DELETE /:id` — ADMIN only

**`src/routes/lecturer.js`**
- `/on-leave` must be defined BEFORE `/:userId/leave` — otherwise Hono matches `on-leave` as a userId param

---

## 9. Admin Dashboard File Structure

```
campus-companion-admin/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── api/
    │   └── client.js
    ├── context/
    │   └── AuthContext.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── DashboardPage.jsx
        ├── BookingsPage.jsx
        ├── NoticesPage.jsx
        ├── LeavePage.jsx
        └── FacilitiesPage.jsx
    └── components/
        └── Layout.jsx
```

---

## 10. Admin Dashboard Key Files

### `src/api/client.js`
```js
import axios from 'axios'
export const API_BASE = 'http://localhost:3000'
const api = axios.create({ baseURL: API_BASE })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cc_admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cc_admin_token')
      localStorage.removeItem('cc_admin_user')
      window.location.href = '/login'
    }
    return Promise.reject(err.response?.data || err)
  }
)
export default api
```

### `src/context/AuthContext.jsx`
```jsx
import React, { createContext, useContext, useState } from 'react'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => { try { return JSON.parse(localStorage.getItem('cc_admin_user')) } catch { return null } })
  const [token, setToken] = useState(() => localStorage.getItem('cc_admin_token'))
  const login = (tokenVal, userVal) => {
    localStorage.setItem('cc_admin_token', tokenVal)
    localStorage.setItem('cc_admin_user', JSON.stringify(userVal))
    setToken(tokenVal); setUser(userVal)
  }
  const logout = () => {
    localStorage.removeItem('cc_admin_token')
    localStorage.removeItem('cc_admin_user')
    setToken(null); setUser(null)
  }
  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
```

---

## 11. Mobile App File Structure

```
CampusCompanion/
├── App.js
├── index.js
├── package.json
└── src/
    ├── api/
    │   └── client.js
    ├── context/
    │   └── AuthContext.js
    ├── navigation/
    │   └── AppNavigator.js
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── HomeScreen.js          ← Logout button fixed (44×44, hitSlop, zIndex)
    │   ├── ContactsScreen.js      ← Fetches lecturers via GET /contacts + on-leave badge
    │   ├── ContactDetailScreen.js ← Uses contact.department (not contact.dept), getInitials fixed
    │   ├── ScheduleScreen.js      ← Students only — not shown to lecturers
    │   ├── NoticeBoardScreen.js
    │   ├── BookingScreen.js
    │   ├── MybookingsScreen.js
    │   └── MyLeaveScreen.js
    └── theme/
        └── theme.js
```

### Mobile App key file notes

**`App.js`**
```js
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

**`AppNavigator.js`** — role-based tabs:
```js
// Students  → Home, Contacts, Schedule, Notices, Bookings
// Lecturers → Home, Contacts, Notices, Leave        (NO Schedule)
// Admins    → Home, Contacts, Schedule, Notices, Bookings, Leave

if (role === 'LECTURER') return <LecturerTabs />;
if (role === 'ADMIN')    return <AdminTabs />;
return <StudentTabs />;
```

**`src/api/client.js`** — update `API_BASE` to your LAN IP when testing on a physical device
```js
export const API_BASE = 'http://192.168.0.111:3000'; // ← run ipconfig to find your IP
// export const API_BASE = 'http://10.0.2.2:3000';   // Android emulator
```

**Safe area handling** — never use `useSafeAreaInsets()` in screens (causes re-render loop on Android SDK 55):
```js
header: { paddingTop: StatusBar.currentHeight + spacing.md || 48 }
```

**ContactsScreen / ContactDetailScreen field names** — contacts now come from the `User` table:
- Use `contact.department` (not `contact.dept`)
- Use `contact.phone` (mapped from `user.contact` field in backend)
- Use `contact.officeHours` (hardcoded as `'Mon–Fri, 9:00–17:00'` in backend response)
- On-leave check: `leaveRes.data.map(l => l.email)` — email is at top level (User object)

---

## 12. Auth — How It Works

- **No self-registration.** Students pre-loaded from CSV via `node prisma/import-students.js`
- **Lecturers** imported via `node prisma/import-lecturers.js` — same `User` table, `role = LECTURER`
- **Default password** = studentId/employeeId (e.g. `02241241` for students, `L001` for lecturers)
- **Login accepts** email OR studentId/employeeId in the identifier field
- **JWT** contains `{ id, role, email, name }` — role is read directly from token in middleware
- **Admin dashboard** stores JWT in `localStorage` under key `cc_admin_token`
- **Mobile app** stores JWT in `AsyncStorage` under key `token`

---

## 13. Data Import Commands

```bash
node prisma/import-students.js   prisma/data/students.csv
node prisma/import-lecturers.js  prisma/data/lecturers.csv   # NEW — imports lecturers as LECTURER role
node prisma/import-facilities.js prisma/data/facilities.csv
node prisma/import-notices.js    prisma/data/notices.csv
```

> ⚠️ `import-contacts.js` and `contacts.csv` are **no longer used** — contacts are now lecturers from the User table.

If passwords appear broken after import:
```bash
node prisma/fix-passwords.js
```

To seed sample data (admin + student + lecturer + schedule + notices + facilities):
```bash
node prisma/seed.js
```

To verify lecturers exist in DB:
```bash
node -e "
const prisma = require('./src/db');
prisma.user.findMany({ where: { role: 'LECTURER' }, select: { studentId: true, email: true, name: true } })
  .then(r => console.log(r))
  .finally(() => prisma.\$disconnect())
"
```

---

## 14. Test Credentials

| Role | Email / ID | Password |
|---|---|---|
| Admin | admin@cst.edu.bt | admin123 |
| Student (seed) | student@cst.edu.bt | student123 |
| Lecturer (seed) | lecturer@cst.edu.bt | lecturer123 |
| Imported students | their email or studentId | their studentId (e.g. 02240101) |
| Imported lecturers | their email or employeeId | their employeeId (e.g. L001) |

---

## 15. How to Run Everything

```bash
# Terminal 1 — Backend
cd campus-companion-backend
npm run dev    # → http://localhost:3000

# Terminal 2 — Admin Dashboard
cd campus-companion-admin/campus-companion-admin   # note: nested folder from zip extraction
npm install
npm run dev    # → http://localhost:5173

# Terminal 3 — Mobile App
cd CampusCompanion
npx expo start
# Press 'a' for Android emulator
# Scan QR with Expo Go (must be SDK 55) for physical device
```

### Network setup for physical device
1. Run `ipconfig` on Windows — find IPv4 Address under Wi-Fi adapter
2. Update `API_BASE` in `CampusCompanion/src/api/client.js` to that IP
3. Phone and PC must be on the same WiFi
4. Test: open `http://<YOUR_IP>:3000/` in your phone browser — should show API running message

---

## 16. What Is Completed ✅

### Backend ✅
- [x] Hono server with all routes mounted
- [x] PostgreSQL + Prisma 7 with adapter-pg
- [x] JWT auth middleware (authMiddleware, adminMiddleware, lecturerMiddleware)
- [x] Three user roles: STUDENT, LECTURER, ADMIN
- [x] Login by email OR studentId/employeeId
- [x] Import scripts: students + lecturers (leading-zero safe)
- [x] All data models (Contact model removed — lecturers serve as contacts)
- [x] FCFS booking — PENDING slots are immediately locked
- [x] `GET /bookings/slots` returns slotMap with booker name
- [x] Notices restricted — only ADMIN can create/edit/delete
- [x] Full lecturer leave CRUD (`/lecturer/*` routes)
- [x] `GET /contacts` now queries `User` WHERE `role = LECTURER`
- [x] `seed.js` includes admin + student + lecturer seed accounts
- [x] CORS updated to allow `localhost:5173` (admin dashboard) + `OPTIONS` method for preflight

### Mobile App ✅
- [x] All 9 screens built with full UI
- [x] SDK upgraded to 55
- [x] Role-based bottom tab navigation (3 different tab sets)
- [x] Schedule tab — **students only**, removed from lecturer tabs
- [x] `AuthContext` exposes `role` directly
- [x] `client.js` exports `get`, `post`, `patch`, `del`
- [x] `BookingScreen` — shows booker name on taken slots
- [x] `ContactsScreen` — fetches lecturers as contacts, shows On Leave badge
- [x] `ContactDetailScreen` — on-leave badge, uses `contact.department` field correctly
- [x] `MyLeaveScreen` — full leave management for lecturers
- [x] `HomeScreen` — logout button fixed (44×44 tap target, hitSlop, zIndex above decorations)
- [x] JWT auth with AsyncStorage
- [x] `SafeAreaProvider` added to `App.js`
- [x] Removed `useSafeAreaInsets` from all screens — replaced with `StatusBar.currentHeight`
- [x] Added `overScrollMode="never"` to all ScrollViews

### Admin Dashboard ✅
- [x] Vite + React scaffold with full custom CSS design system
- [x] DM Serif Display + DM Sans fonts — matches CST brand navy + gold
- [x] `LoginPage.jsx` — split-panel, POST `/auth/login`, role check, redirect if logged in
- [x] `ProtectedRoute` + `PublicRoute` guards
- [x] `Layout.jsx` — fixed sidebar, nav links with active states, user card with logout
- [x] `AuthContext.jsx` — JWT stored in localStorage, auto-reads on mount
- [x] Axios client — auto-attaches JWT, auto-redirects to `/login` on 401
- [x] TanStack Query — all data fetching with caching + invalidation on mutations
- [x] `DashboardPage.jsx` — 5 stat cards, recent bookings table, on-leave sidebar
- [x] `BookingsPage.jsx` — filter tabs with counts, search, approve/reject with optimistic UI
- [x] `NoticesPage.jsx` — card grid, pinned section, create/edit/delete modals, category filter
- [x] `LeavePage.jsx` — active/upcoming/past filter, cancel leave modal, color-coded borders
- [x] `FacilitiesPage.jsx` — facility cards with color bars, booking + pending counts, rules preview

---

## 17. What Is Remaining 🔲

### Backend Enhancements (Optional / Stretch)
- [ ] `GET /lecturer/leave/all` — single endpoint to fetch ALL lecturer leave (currently the dashboard fetches per-user)
- [ ] `POST /schedule`, `PATCH /schedule/:id`, `DELETE /schedule/:id` (admin only)
- [ ] Facility blackout model — block facilities for maintenance
- [ ] Push notifications when booking approved/rejected
- [ ] Refresh token mechanism
- [ ] Deploy to Railway or Render (free PostgreSQL tier)

### Admin Dashboard Enhancements (Optional)
- [ ] Add a lecturer management page (view/add/edit lecturers — replaces old contacts page)
- [ ] Add a schedule management page
- [ ] Export bookings to CSV
- [ ] Date range filter on BookingsPage
- [ ] Pagination for large booking tables
- [ ] Toast notifications on approve/reject success

### Mobile Polish (Optional)
- [ ] Show student's name/year on HomeScreen from AuthContext
- [ ] Handle JWT expiry gracefully (auto-logout with message)
- [ ] Filter schedule by student's programme/year
- [ ] Hook ScheduleScreen up to backend `GET /schedule`

---

## 18. Known Issues & Limitations

| Issue | Status | Detail |
|---|---|---|
| SDK 54 → 55 upgrade | Fixed | Run `npx expo install expo@~55.0.0 --fix` if dependency issues appear |
| Physical device IP | Fixed | Re-run `ipconfig` if your network changes, update `API_BASE` in client.js |
| `AsyncStorage.multiRemove` dev lines | Fixed | Removed from `AuthContext.js` — was causing re-render loop on every launch |
| `useSafeAreaInsets` re-render loop | Fixed | Removed from all screens — `SafeAreaProvider` now lives in `App.js` only |
| Android overscroll refresh indicator | Fixed | Added `overScrollMode="never"` to all ScrollViews |
| HomeScreen/ScheduleScreen header overlap | Fixed | Using `StatusBar.currentHeight` for paddingTop |
| `seed.js` Prisma 7 error | Fixed | Now imports `../src/db` instead of `new PrismaClient()` |
| CORS blocking admin dashboard | Fixed | Added `localhost:5173` and `OPTIONS` to CORS config in `src/index.js` |
| Logout button not tappable | Fixed | Button is now 44×44, has hitSlop, zIndex:10 above hero decorations |
| ContactDetailScreen crash | Fixed | Was reading `contact.dept` — now reads `contact.department` from User-based API |
| Contact model redundancy | Fixed | Contact table removed — `GET /contacts` now queries `User WHERE role=LECTURER` |
| Lecturer had Schedule tab | Fixed | Schedule tab removed from LecturerTabs in AppNavigator |
| Admin zip nested folder | Known | After extracting, `cd campus-companion-admin/campus-companion-admin` before running npm |
| Leave page only shows active lecturers | Known | Add `/lecturer/leave/all` endpoint to backend for full history |
| Call/Email on emulator | Known | `Linking.openURL('tel:...')` requires a real device |
| Schedule not connected to backend | Known | ScheduleScreen uses static data — backend hookup is pending |
| No refresh token | Known | JWT expires after 7 days, user must re-login |
| No push notifications | Known | Booking status changes don't notify students yet |

---

## 19. How to Continue in a New Claude Chat

Paste this entire file and say:

> **"Continue building my Campus Companion project. Here is the full context."**

Then ask for what you need:

- *"Add a GET /lecturer/leave/all endpoint to the backend so the Leave page shows all records"*
- *"Add a lecturer management page to the admin dashboard"*
- *"Add export to CSV on the bookings page"*
- *"Add pagination to the bookings table"*
- *"Help me deploy the backend to Railway"*
- *"Hook ScheduleScreen up to GET /schedule backend endpoint"*
- *"Add toast notifications when a booking is approved or rejected in the admin dashboard"*
- *"Add push notifications to the mobile app when booking status changes"*

Claude will have full context of every route, database schema, all middleware, all screens, all dashboard pages, and all design decisions.

---

*Last updated: May 2026 | CST, RUB — SWE201 Programming Assignment 1 | System v3.0*
*(All three parts complete: Backend + Mobile App + Admin Dashboard)*
*(Changes in this session: Contact model removed — contacts now served from User table (LECTURER role). Lecturer tabs no longer include Schedule. Logout button fixed. ContactDetailScreen field name bug fixed. Lecturer seed account added. import-lecturers.js added. students.csv and lecturers.csv dummy data created.)*