# Campus Companion — Progress & Handoff

> **To resume in a new chat:** Paste this file and `futureprogress.md` and say:
> *"Continue building my Campus Companion project. Here is the full context."*

---

## 1. Project Overview

**Course:** SWE201 – Cross Platform Development | PA1 | Year 3, Sem 2 | CST, RUB, Phuentsholing

A full-stack digital companion for students, lecturers, and admins at CST with three parts:

| Part | Stack | Status |
|---|---|---|
| Mobile App | Expo SDK 55 / React Native | ✅ Core complete; Contacts + Leave UX updated (Jun 2026) |
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
| `LECTURER` | Login · contacts · notices · submit/cancel own leave (auto-announced) · teaching schedule · college leave board |
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
        ├── contacts.js           ← JWT + department scope (?scope=mine|all|<DEPT>)
        ├── schedule.js           ← Phase 2 complete: role-aware, admin CRUD, lecturer assignment
        ├── notices.js            ← Phase 2 ready for targeting (targeting logic next)
        ├── facilities.js
        ├── bookings.js
        ├── lecturer.js           ← Leave CRUD; cancel deletes linked notice + SSE broadcast
        └── users.js              ← GET/PATCH /users/me, push token
    ├── sse.js                    ← broadcastNewNotice + broadcastNoticeDeleted
    └── utils/
        ├── leaveNotice.js        ← Creates Notice with [leave:id] marker
        └── pushNotifications.js

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
    │   ├── ContactsScreen.js     ← Dept dropdown picker; default my dept; server-scoped fetch
    │   ├── ContactDetailScreen.js ← On-leave badge (uses leave.user.email)
    │   ├── ScheduleScreen.js     ← Phase 2 complete: role-aware (student timetable / lecturer teaching view)
    │   ├── NoticeBoardScreen.js  ← SSE live notices; removes leave notice on cancel event
    │   ├── BookingScreen.js
    │   ├── MybookingsScreen.js
    │   ├── MyLeaveScreen.js      ← Full-width Cancel Leave button; college leave board
    │   └── ProfileScreen.js      ← Student/lecturer profile view + contact edit
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
| GET | `/contacts` | Lecturers — **JWT required**. `?scope=mine` (default for students), `?scope=all`, or `?scope=<Department enum>`. Optional `?search=` |
| GET | `/contacts/:id` | Single lecturer contact |
| GET | `/users/me` | Current user profile (department, year, etc.) |
| PATCH | `/users/me` | Students: contact; Lecturers: contact + officeHours |
| POST | `/users/push-token` | Save Expo push token |
| GET | `/notices/live` | SSE stream for real-time notices |
| GET | `/notices` | All notices (`?category=`) |
| GET | `/facilities` | All facilities |
| GET | `/bookings/my` | Current user's bookings |
| GET | `/bookings/slots?facilityId=&date=` | slotMap → `{ bookedBy, status }` |
| POST | `/bookings` | Students only, FCFS conflict check |
| GET | `/schedule` | Role-aware: student sees dept+year timetable, lecturer sees teaching schedule |
| GET | `/lecturer/on-leave` | Lecturers on approved leave today |
| GET | `/lecturer/leave/all` | All leave records with department info (all roles) |
| GET | `/lecturer/leave/me` | Current user's leave history |
| POST | `/lecturer/leave` | Submit leave — **auto-APPROVED** + Notice Board announcement |
| DELETE | `/lecturer/leave/:id` | Cancel leave; deletes linked notice; SSE `deleted` broadcast |
| PATCH | `/lecturer/leave/:id/status` | Returns 403 (approval workflow disabled in mobile flow) |

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

## 8. Known Fixes Applied

### Mobile — Contacts & Leave (Jun 2026)

#### `ContactsScreen.js`
1. **Department filtering (server-side)** — `GET /contacts?scope=mine` uses logged-in user's `department` from JWT; no unreliable client-only filter.
2. **Default view** — Opens on **my department** lecturers (`deptFilter = 'mine'`).
3. **Department picker UI** — Replaced horizontal sliding chips with a **dropdown / bottom sheet** (“Showing lecturers from” → tap to select department or All).
4. **Performance** — Memoized rows, tuned `FlatList` (`initialNumToRender`, `windowSize`); filter changes use pull-to-refresh style update instead of full-screen blocking spinner; on-leave fetched once per screen focus.
5. **Layout** — Fixed header + picker pinned above list (`topFixed`); filters always visible (not hidden during load).
6. **On-leave badges** — Fixed email mapping: `leave.user?.email` (not `leave.email`).

#### `ContactDetailScreen.js`
- Same on-leave email fix for detail banner.

#### `MyLeaveScreen.js`
1. **Cancel button** — Replaced trash icon with full-width red **Cancel Leave** button on each card (own row, not squeezed beside badge).
2. **Card layout** — Removed `overflow: hidden` clipping; status bar padding on header.

#### `NoticeBoardScreen.js`
- SSE handler for `{ type: 'deleted', id }` — leave notice disappears when lecturer cancels without manual refresh.

### Backend — Contacts & Leave (Jun 2026)

#### `src/routes/contacts.js`
- All routes behind `authMiddleware`.
- `resolveDepartmentScope(user, scope)` — students default to own department unless `scope=all`.
- Returns raw `department` enum (removed misleading `'CST'` fallback string).
- Students with no department get empty list + message.

#### `src/routes/lecturer.js` + `src/utils/leaveNotice.js` + `src/sse.js`
- Leave submit → `createLeaveAnnouncementNotice()` posts to Notice Board with `[leave:id]` marker in body.
- Leave cancel → `deleteMany` on matching notices → `broadcastNoticeDeleted(noticeId)` to all SSE clients.

### Phase 2 — Schedule & Admin (earlier)

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
- **Leave visibility** — `GET /lecturer/leave/all` returns all lecturer leave with department info
- **Mobile leave screen** — status badges, college-wide leave board, cancel leave + notice cleanup
- **Leave announcements** — Submit leave → auto-APPROVED + Notice Board post; cancel → notice removed (DB + SSE)
- **Schedule system rebuild** — role-aware backend routes, admin timetable grid page, mobile schedule screen for both students (dept+year view) and lecturers (personal teaching view)
- **6 schedule bugs fixed** — see section 8 above
- **Admin leave page** — view/filter college leave (approve/reject may be disabled in current API — mobile uses direct announce flow)

### ✅ Phase 2.1 — Contacts & Leave UX (Jun 2026)
- [x] Contacts: server-side department scope (`/contacts?scope=`)
- [x] Contacts: default my-department view + department dropdown picker
- [x] Contacts: on-leave badge fix, layout/performance improvements
- [x] My Leave: visible Cancel Leave button UI
- [x] Leave cancel: auto-delete Notice Board message + SSE real-time removal
- [x] `GET /users/me` profile refresh in `AuthContext` (department on login)

---

## 12. What's Remaining

### Phase 2 ✅ Complete
- [x] Leave approval, leave board, schedule rebuild, notice targeting, lecturer Schedule tab

### Phase 3 — Communications
- [x] File attachments on notices
- [ ] Push notifications (Expo push tokens + all trigger events)

### Phase 4 — User Management
- [x] Profile screen (mobile — basic view + contact edit for students/lecturers)
- [ ] Profile: full edit flows, avatar, password change
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

*Campus Companion v4.1 — SWE201 PA1 — CST, RUB — Jun 2026*
*Phase 1 + Phase 2 + Contacts/Leave UX complete. Next: Phase 3 push notifications (triggers wired partially).*

---

## 14. Quick Reference — Contacts API

| `scope` query | Who sees what |
|---|---|
| *(none)* or `mine` | Students → lecturers in **their** `User.department`; lecturers/admins → all unless `mine` with dept set |
| `all` | All lecturers |
| `SOFTWARE_ENGINEERING` (etc.) | Lecturers in that department only |

**Mobile default:** `scope=mine` on first open → Software Engineering student sees only Software Engineering lecturers.

**Change department in app:** Contacts → tap “Showing lecturers from” row → pick from bottom sheet.