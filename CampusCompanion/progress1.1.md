# Campus Companion — Progress & Handoff

> **To resume in a new chat:** Paste this file and `futureprogress.md` and say:
> *"Continue building my Campus Companion project. Here is the full context."*

---

## 1. Project Overview

**Course:** SWE201 – Cross Platform Development | PA1 | Year 3, Sem 2 | CST, RUB, Phuentsholing

A full-stack digital companion for students, lecturers, and admins at CST with three parts:

| Part | Stack | Status |
|---|---|---|
| Mobile App | Expo SDK 55 / React Native | ✅ Core complete, Phase 2 screens updated |
| Backend API | Node.js / Hono / PostgreSQL | ✅ Phase 1 + Phase 2 complete |
| Admin Dashboard | Vite + React | ✅ Phase 1 + Phase 2 complete |

---

## 2. Tech Stack

### Mobile (Expo SDK 55)
`expo` · `react-native` · `@react-navigation/native` · `@react-navigation/stack` · `@react-navigation/bottom-tabs` · `expo-linear-gradient` · `@expo/vector-icons` · `@react-native-async-storage/async-storage@2.2.0` · `react-native-safe-area-context`

### Backend (Node.js)
`hono@^4` · `@hono/node-server` · `prisma@^7` · `@prisma/adapter-pg` · `pg` · `jsonwebtoken` · `bcryptjs` · `zod` · `dotenv` · `nodemon`

> ⚠️ Prisma 7: `DATABASE_URL` lives in `prisma/prisma.config.js`, NOT `schema.prisma`. Must use `@prisma/adapter-pg`.

### Admin Dashboard (Vite + React)
`vite@^6` · `react@^18` · `react-router-dom@^6.28` · `axios@^1.7` · `@tanstack/react-query@^5` · `lucide-react` · `date-fns@^4`

---

## 3. User Roles

| Role | Permissions |
|---|---|
| `STUDENT` | Login · contacts · notices · schedule (own dept+year) · book facilities · view own bookings · view own attendance |
| `LECTURER` | Login · contacts · notices · manage own leave · view teaching schedule · view colleague leave board |
| `ADMIN` | All of the above + approve/reject bookings · approve/reject leave · create/edit/delete notices · manage schedule · manage lecturers · manage students |

---

## 4. Database Schema (Current — Post Phase 1 Migration)

```prisma
// prisma/schema.prisma

enum Role            { STUDENT LECTURER ADMIN }
enum BookingStatus   { PENDING APPROVED REJECTED }
enum LeaveStatus     { PENDING APPROVED REJECTED }
enum Department {
  ELECTRICAL_ENGINEERING
  WATER_RESOURCE_ENGINEERING
  CIVIL_ENGINEERING
  SOFTWARE_ENGINEERING
  INFORMATION_TECHNOLOGY
  ARCHITECTURE
  ELECTRONICS_ENGINEERING
  INSTRUMENTATION_ENGINEERING
  MECHANICAL_ENGINEERING
  GEOLOGY
}
enum Designation {
  HEAD_OF_DEPARTMENT
  SENIOR_LECTURER
  LECTURER
  LAB_TECHNICIAN
  ADMIN_STAFF
}
enum TargetType  { EVERYONE DEPARTMENT YEAR_GROUP ROLE_ONLY }
enum TargetRole  { LECTURERS_ONLY STUDENTS_ONLY }
enum AttachmentType { IMAGE PDF DOCUMENT }

model User {
  id             Int              @id @default(autoincrement())
  studentId      String           @unique
  name           String
  email          String           @unique
  password       String
  role           Role             @default(STUDENT)
  department     Department?
  contact        String?
  // Student fields
  intakeYear     Int?
  semester       Int?
  programme      String?
  isRepeating    Boolean          @default(false)
  // Lecturer fields
  designation    Designation?
  officeHours    String?
  // Notifications
  pushToken      String?
  createdAt      DateTime         @default(now())
  bookings       Booking[]
  lecturerLeaves LecturerLeave[]
  sentNotices    Notice[]         @relation("SentBy")
  approvedLeaves LecturerLeave[]  @relation("ApprovedBy")
  schedules      Schedule[]       @relation("LecturerSchedule")
  attendanceMarked Attendance[]   @relation("MarkedBy")
  lostItems      LostFound[]      @relation("ReportedBy")
  claimedItems   LostFound[]      @relation("ClaimedBy")
}

model Schedule {
  id           Int          @id @default(autoincrement())
  department   Department
  year         Int
  semester     Int
  academicYear String
  day          String
  time         String
  subject      String
  room         String
  type         String
  lecturerId   Int?
  lecturer     User?        @relation("LecturerSchedule", fields: [lecturerId], references: [id])
  attendances  Attendance[]
}

model Notice {
  id               Int          @id @default(autoincrement())
  title            String
  body             String
  category         String
  pinned           Boolean      @default(false)
  icon             String       @default("megaphone")
  date             DateTime     @default(now())
  targetType       TargetType   @default(EVERYONE)
  targetDepartment Department?
  targetYear       Int?
  targetRole       TargetRole?
  sentById         Int?
  sentBy           User?        @relation("SentBy", fields: [sentById], references: [id])
  attachments      Attachment[]
}

model Attachment {
  id        Int            @id @default(autoincrement())
  noticeId  Int
  fileUrl   String
  fileName  String
  fileType  AttachmentType
  fileSize  Int
  createdAt DateTime       @default(now())
  notice    Notice         @relation(fields: [noticeId], references: [id], onDelete: Cascade)
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
  id           Int           @id @default(autoincrement())
  userId       Int
  facilityId   Int
  date         String
  slots        Int[]
  purpose      String
  status       BookingStatus @default(PENDING)
  academicYear String?
  createdAt    DateTime      @default(now())
  facility     Facility      @relation(fields: [facilityId], references: [id])
  user         User          @relation(fields: [userId], references: [id])
}

model LecturerLeave {
  id           Int         @id @default(autoincrement())
  userId       Int
  startDate    DateTime
  endDate      DateTime
  reason       String?
  status       LeaveStatus @default(PENDING)
  approvedById Int?
  academicYear String?
  createdAt    DateTime    @default(now())
  user         User        @relation(fields: [userId], references: [id])
  approvedBy   User?       @relation("ApprovedBy", fields: [approvedById], references: [id])
}

// Attendance and LostFound models exist in schema but are Phase 5 — not yet wired up
model Attendance {
  id           Int              @id @default(autoincrement())
  studentId    Int
  scheduleId   Int
  date         DateTime
  status       AttendanceStatus @default(ABSENT)
  markedById   Int?
  markedAt     DateTime         @default(now())
  academicYear String?
  student      User             @relation(fields: [studentId], references: [id])
  schedule     Schedule         @relation(fields: [scheduleId], references: [id])
  markedBy     User?            @relation("MarkedBy", fields: [markedById], references: [id])
  @@unique([studentId, scheduleId, date])
}

enum AttendanceStatus { PRESENT ABSENT LATE }

model LostFound {
  id            Int             @id @default(autoincrement())
  type          LostFoundType
  title         String
  description   String
  location      String?
  imageUrl      String?
  status        LostFoundStatus @default(OPEN)
  reportedById  Int
  claimedById   Int?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  reportedBy    User            @relation("ReportedBy", fields: [reportedById], references: [id])
  claimedBy     User?           @relation("ClaimedBy", fields: [claimedById], references: [id])
}

enum LostFoundType   { LOST FOUND }
enum LostFoundStatus { OPEN CLAIMED RESOLVED CLOSED }
```

---

## 5. Folder Structure

```
campus-companion-backend/
├── prisma/
│   ├── schema.prisma             ← Phase 1 complete — all enums, new fields, rebuilt models
│   ├── prisma.config.js
│   ├── seed.js                   ← Updated: Department enum, intakeYear, designation, new Schedule shape
│   ├── fix-passwords.js
│   ├── import-students.js        ← Updated: intakeYear, semester, isRepeating, Department enum
│   ├── import-lecturers.js       ← Updated: designation, officeHours, Department + Designation enums
│   ├── import-facilities.js
│   ├── import-notices.js
│   └── data/
│       ├── students.csv
│       └── lecturers.csv
└── src/
    ├── index.js                  ← All routes mounted including new schedule + leave routes
    ├── db.js
    ├── middleware/
    │   ├── auth.js
    │   └── errorHandler.js
    └── routes/
        ├── auth.js
        ├── contacts.js
        ├── schedule.js           ← Phase 2 complete: role-aware, admin CRUD, lecturer assignment
        ├── notices.js            ← Phase 2 ready for targeting (targeting logic next)
        ├── facilities.js
        ├── bookings.js
        └── lecturer.js           ← Phase 2 complete: PENDING→APPROVED/REJECTED workflow, /leave/all

campus-companion-admin/
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css                 ← Full CSS design system (navy + gold, DM Serif + DM Sans)
    ├── api/client.js
    ├── context/AuthContext.jsx
    └── pages/
        ├── LoginPage.jsx
        ├── DashboardPage.jsx
        ├── BookingsPage.jsx
        ├── NoticesPage.jsx
        ├── LeavePage.jsx         ← Phase 2 complete: approve/reject buttons, status badges, dept filter
        ├── SchedulePage.jsx      ← Phase 2 complete: timetable grid, lecturer assign, all bugs fixed
        └── FacilitiesPage.jsx

CampusCompanion/
├── App.js
└── src/
    ├── api/client.js
    ├── context/AuthContext.js
    ├── navigation/AppNavigator.js ← Phase 2: Schedule tab added for lecturers
    ├── screens/
    │   ├── LoginScreen.js
    │   ├── HomeScreen.js
    │   ├── ContactsScreen.js
    │   ├── ContactDetailScreen.js
    │   ├── ScheduleScreen.js     ← Phase 2 complete: role-aware (student timetable / lecturer teaching view)
    │   ├── NoticeBoardScreen.js
    │   ├── BookingScreen.js
    │   ├── MybookingsScreen.js
    │   └── MyLeaveScreen.js      ← Phase 2 complete: status badges, leave board for lecturers
    └── theme/theme.js
```

---

## 6. Key Code Snippets

### `src/db.js`
```js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
module.exports = prisma;
```

### `prisma/prisma.config.js`
```js
require('dotenv').config();
const { defineConfig } = require('prisma/config');
module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DATABASE_URL },
});
```

### Academic year helper (used in `schedule.js`)
```js
// Accounts for academic year starting in August (month index 7)
function deriveCurrentYear(intakeYear, academicStartMonth = 7) {
  const now = new Date();
  const academicYearStart = now.getMonth() >= academicStartMonth
    ? now.getFullYear()
    : now.getFullYear() - 1;
  return academicYearStart - intakeYear + 1;
}
```

### `src/middleware/auth.js`
```js
const jwt = require('jsonwebtoken');

const authMiddleware = async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer '))
    return c.json({ success: false, message: 'Unauthorized' }, 401);
  try {
    c.set('user', jwt.verify(header.split(' ')[1], process.env.JWT_SECRET));
    await next();
  } catch {
    return c.json({ success: false, message: 'Invalid token' }, 401);
  }
};

const adminMiddleware = async (c, next) => {
  if (c.get('user')?.role !== 'ADMIN')
    return c.json({ success: false, message: 'Admins only' }, 403);
  await next();
};

const lecturerMiddleware = async (c, next) => {
  const role = c.get('user')?.role;
  if (role !== 'LECTURER' && role !== 'ADMIN')
    return c.json({ success: false, message: 'Lecturers only' }, 403);
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

---

## 7. API Reference

### Public
| Method | Route | Notes |
|---|---|---|
| POST | `/auth/login` | Accepts email OR studentId |

### Authenticated (JWT required)
| Method | Route | Notes |
|---|---|---|
| GET | `/contacts` | Returns lecturers (`?search=`) |
| GET | `/notices` | All notices (`?category=`) |
| GET | `/facilities` | All facilities |
| GET | `/bookings/my` | Current user's bookings |
| GET | `/bookings/slots?facilityId=&date=` | slotMap → `{ bookedBy, status }` |
| POST | `/bookings` | Students only, FCFS conflict check |
| GET | `/schedule` | Role-aware: student sees dept+year timetable, lecturer sees teaching schedule |
| GET | `/lecturer/on-leave` | Lecturers on approved leave today |
| GET | `/lecturer/leave/all` | All leave records with department info (all roles) |
| POST | `/lecturer/leave` | Lecturer/Admin submit leave — starts as PENDING |
| DELETE | `/lecturer/leave/:id` | Cancel own leave |

### Admin only
| Method | Route | Notes |
|---|---|---|
| GET | `/bookings/all` | All bookings |
| PATCH | `/bookings/:id/status` | Approve or reject a booking |
| POST/PATCH/DELETE | `/notices/:id` | Create, edit, delete notices |
| GET | `/schedule/department/:dept/year/:year` | Full timetable for dept+year (all semesters) |
| POST | `/schedule` | Create schedule entry with lecturer assignment |
| PATCH | `/schedule/:id` | Edit entry including reassigning lecturer |
| DELETE | `/schedule/:id` | Delete entry (returns 404/409 on Prisma errors) |
| PATCH | `/lecturer/leave/:id/status` | Approve or reject a leave request |

---

## 8. Known Fixes Applied (Phase 2)

### `SchedulePage.jsx` — 6 bugs fixed
1. **Day pre-selection** — column "Add class" buttons pass `{ _new: true, day }` so modal opens on correct day
2. **`lecturerId` type safety** — always coerced to string for `<select>`, null-checked with `!= null`
3. **Semester comparison** — `Number(s.semester) === Number(semester)` prevents silent empty timetable
4. **`window.confirm` removed** — replaced with styled `DeleteConfirmModal` component
5. **Delete error handling** — `onError` handler shows toast notification instead of silent failure
6. **Toast component** — bottom-right auto-dismissing toast for delete success and failure

### `schedule.js` — 4 bugs fixed
1. **Academic year calculation** — `deriveCurrentYear()` helper accounts for when academic year starts (August), not just `getFullYear() - intakeYear + 1`
2. **Repeating students** — uses `user.repeatYear ?? currentYear` instead of raw `user.intakeYear`
3. **PATCH type coercion** — `year`, `semester`, `lecturerId` explicitly coerced before Prisma call
4. **DELETE error handling** — Prisma P2025 (not found) → 404, P2003 (FK constraint) → 409

---

## 9. How to Run

```bash
# Backend
cd campus-companion-backend && npm run dev   # → localhost:3000

# Admin Dashboard
cd campus-companion-admin/campus-companion-admin && npm run dev   # → localhost:5173

# Mobile
cd CampusCompanion && npx expo start
```

**Physical device:** run `ipconfig`, find your Wi-Fi IPv4, update `API_BASE` in `CampusCompanion/src/api/client.js`.

**After schema changes:** `npx prisma migrate dev --name <migration_name>`

**Seed DB:** `node prisma/seed.js`

**Import data:**
```bash
node prisma/import-students.js  prisma/data/students.csv
node prisma/import-lecturers.js prisma/data/lecturers.csv
```

---

## 10. Test Credentials

| Role | Login | Password |
|---|---|---|
| Admin | admin@cst.edu.bt | admin123 |
| Student | student@cst.edu.bt | student123 |
| Lecturer | lecturer@cst.edu.bt | lecturer123 |
| Imported users | email or studentId/employeeId | their studentId/employeeId |

---

## 11. Completed Phases

### ✅ Phase 1 — Data Foundation
- Department enum (10 values) replacing free text
- User model: `intakeYear`, `isRepeating`, `semester`, `programme`, `designation`, `officeHours`, `pushToken`
- LecturerLeave: `status` (LeaveStatus enum), `approvedById`, `academicYear`
- Notice: `targetType`, `targetDepartment`, `targetYear`, `targetRole`, `sentById`
- Attachment model (linked to Notice, Cascade delete)
- Schedule model: rebuilt with `department`, `year`, `semester`, `academicYear`, `lecturerId`
- Booking: `academicYear` field
- Attendance and LostFound models in schema (Phase 5 routes not yet built)
- Migration run: `phase1_data_foundation`
- seed.js, import-students.js, import-lecturers.js all updated for new fields and enums

### ✅ Phase 2 — Core Feature Updates
- **Leave approval workflow** — `PATCH /lecturer/leave/:id/status` backend route
- **Leave visibility** — `GET /lecturer/leave/all` returns all lecturer leave with department info
- **Admin leave page** — approve/reject buttons, status filter tabs (All/Pending/Approved/Rejected), department filter
- **Mobile leave screen** — status badges (PENDING amber, APPROVED green, REJECTED red), college-wide leave board section for lecturers
- **Schedule system rebuild** — role-aware backend routes, admin timetable grid page, mobile schedule screen for both students (dept+year view) and lecturers (personal teaching view)
- **6 schedule bugs fixed** — see section 8 above

---

## 12. What's Remaining

### Phase 2 (one item left)
- [ ] Notice targeting — server-side filter on `GET /notices` based on user's dept/year/role + admin target selector on creation form

### Phase 3 — Communications
- [ ] File attachments on notices (Cloudinary setup + upload endpoint + mobile attachment viewer)
- [ ] Push notifications (Expo push tokens + all trigger events)

### Phase 4 — User Management
- [ ] Profile screen (mobile — students and lecturers)
- [ ] Lecturer management page (admin dashboard)
- [ ] Student management page with bulk year progression (admin dashboard)
- [ ] Department-aware home screen alerts (mobile)

### Phase 5 — Advanced Features
- [ ] Attendance tracking (routes, lecturer marking UI, student percentage view, at-risk alerts)
- [ ] Lost and Found (routes, mobile screen, admin management page)

---

## 13. Design Tokens

| Token | Value |
|---|---|
| Primary | `#1A3C6E` (CST navy) |
| Accent | `#F4A623` (gold) |
| Background | `#F0F2F7` |
| Mobile fonts | StyleSheet.create() only, tokens in `src/theme/theme.js` |
| Dashboard fonts | DM Serif Display (headings) + DM Sans (body) |
| Dashboard CSS | Full design system in `index.css` — variables for all colours, shadows, radii |

---

*Campus Companion v4.0 (in progress) — SWE201 PA1 — CST, RUB — May 2026*
*Phase 1 + Phase 2 complete. Phase 2 notice targeting remaining.*