# Campus Companion — Future Progress & Feature Roadmap

> This file documents all planned updates, new features, data model changes, and system improvements.
> Use alongside `progress.md` when continuing in a new Claude chat.
>
> **To continue:** Paste both files and say:
> **"Continue building my Campus Companion project. Here is the full context and future roadmap."**

---

## 1. Summary of What Has Been Done vs What Remains

### ✅ Done
| # | Issue | Resolution |
|---|---|---|
| 1 | Departments were free text strings | Department enum with 10 values, applied to User + Schedule + Notice |
| 2 | Schedule was static, not linked to dept/year/lecturer | Schedule fully rebuilt — dept, year, semester, academicYear, lecturerId |
| 3 | Schedule was students-only | Lecturers now see their own teaching timetable via role-aware `GET /schedule` |
| 4 | Admin could not assign schedules | Admin dashboard SchedulePage with timetable grid and lecturer assignment dropdown |
| 5 | Leave had no approval workflow | PENDING → APPROVED / REJECTED workflow with admin approve/reject in dashboard |
| 6 | Lecturers could not see colleague leave | `GET /lecturer/leave/all` + college-wide leave board on mobile leave screen |
| 7 | Notices go to everyone | Server-side targeting on `GET /notices`, admin target selector, mobile target badges |
| 8 | No file/image attachments on notices | Upload endpoint, admin file picker, mobile image preview + open/download |
| 9 | No push notifications | Expo push tokens, notify on leave/booking/notice events |
| 10 | Student year was a manual field | Replaced with `intakeYear` + `deriveCurrentYear()` calculating year automatically |
| 11 | No department head concept | `Designation` enum: HEAD_OF_DEPARTMENT, SENIOR_LECTURER, LECTURER, LAB_TECHNICIAN, ADMIN_STAFF |
| 12 | No academic year tracking | `academicYear` field added to Schedule and Booking; `academicYear` on LecturerLeave |

### 🔲 Still To Do
| # | Issue | Phase |
|---|---|---|
| 13 | Backend and DB running locally — APK cannot reach localhost | Phase 0 (DO THIS FIRST) |
| 14 | No attendance tracking | Phase 5 |
| 15 | No lost and found system | Phase 5 |
| 16 | No self-registration — users cannot sign up themselves | Phase 4.5 |
| 17 | Booking permissions not enforced — students can book any facility | Phase 4.5 |
| 18 | Lecturer leave requires admin approval — should be instant | ✅ Phase 4.5.3 — auto-APPROVED + push on submit |

---

## 2. Database Schema — Current State

The schema is fully migrated through Phase 1. All models below reflect the live database.
**Do not re-run Phase 1 migrations — they are already applied.**

See `progress.md` section 4 for the complete current schema.

### Models with routes fully built (Phase 2 complete)
- `User` — all new fields active
- `Schedule` — rebuilt, role-aware routes complete, admin page complete
- `LecturerLeave` — approval workflow complete
- `Booking` — academicYear field added

### Models with schema done but routes not yet built (Phase 3–5)
- `Notice` — targeting + attachments complete
- `Attachment` — upload via `/upload`, local storage or optional Cloudinary
- `Attendance` — model in schema, all routes **not yet built** (Phase 5)
- `LostFound` — model in schema, all routes **not yet built** (Phase 5)

---

## 3. Remaining Work — Detailed Specs

---

### ⚠️ Phase 0 — Deployment (DO THIS BEFORE ANYTHING ELSE)

This is blocking all further progress. The app is currently wired to `localhost:3000` which only works in Expo Go via tunnel. Once you do an EAS build for APK, the app cannot reach the backend.

**Step 1 — Move database to Neon (free cloud PostgreSQL)**
- Go to https://neon.tech → create free account → create project named `campus-companion`
- Copy the connection string: `postgresql://user:pass@ep-xxx.neon.tech/campus_companion`
- Update `DATABASE_URL` in your `.env` file with this new string
- Run `npx prisma migrate deploy` to apply your existing migrations to the cloud DB
- Re-seed: `node prisma/seed.js`
- Re-import: `node prisma/import-students.js prisma/data/students.csv` and `node prisma/import-lecturers.js prisma/data/lecturers.csv`

**Step 2 — Deploy backend to Railway**
- Push your `campus-companion-backend` folder to a GitHub repo
- Go to https://railway.app → New Project → Deploy from GitHub repo
- Set environment variables in Railway dashboard:
  - `DATABASE_URL` — your Neon connection string
  - `JWT_SECRET` — `cst_rub_campus_companion_secret_2026`
  - `JWT_EXPIRES_IN` — `7d`
  - `PORT` — `3000`
  - Any Cloudinary keys if using attachments
- Railway gives you a URL like `https://campus-companion-backend.up.railway.app`

**Step 3 — Update mobile app API_BASE**
- In `CampusCompanion/src/api/client.js`, replace localhost with your Railway URL:
```js
const API_BASE = "https://campus-companion-backend.up.railway.app";
```

**Step 4 — EAS Build**
```bash
npm install -g eas-cli
eas login
eas build:configure
```
Add to `eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    }
  }
}
```
Run: `eas build --platform android --profile preview`
Download APK from the EAS dashboard link once built.

**Result after Phase 0:**
- APK works on any phone, anywhere
- Push notifications work end to end
- Admin dashboard can be deployed too (Vercel free tier for Vite) or run locally
- Your lecturer can test the app on their own device

---

### Phase 3 — Communications ✅ Complete

#### 3.1 Notice Targeting — DONE
#### 3.2 File Attachments on Notices — DONE
#### 3.3 Push Notifications — DONE

All Phase 3 features are built. They will only work properly once Phase 0 deployment is complete (push tokens require a real device with a real build, not Expo Go).

---

### Phase 4 — User Management

#### 3.4 Profile Screen (Mobile)

New screen: `src/screens/ProfileScreen.js`

**Students see:**
- Name, student ID, department, current year (calculated from intakeYear), semester, programme, email, contact
- Edit contact number inline

**Lecturers see:**
- Name, employee ID, department, designation, office hours (editable inline), email, contact
- Edit office hours and contact number inline

**API:** `GET /users/me` and `PATCH /users/me` — new routes in `src/routes/users.js`

Add Profile tab to both Student and Lecturer tab sets in `AppNavigator.js`.

---

#### 3.5 Lecturer Management Page (Admin Dashboard)

New page: `src/pages/LecturersPage.jsx`

- Table: name, employee ID, department, designation, email, contact, office hours
- Filter by department
- Add lecturer — creates User with LECTURER role
- Edit — change designation, department, office hours
- When a new HEAD_OF_DEPARTMENT is assigned for a department, automatically demote the previous HOD back to LECTURER
- View panel: lecturer's current schedule assignments + leave history

---

#### 3.6 Student Management Page (Admin Dashboard)

New page: `src/pages/StudentsPage.jsx`

- Table: name, student ID, department, intake year, calculated current year, semester, isRepeating flag
- Filter by department and year
- Edit — update semester, toggle isRepeating
- **Bulk Year Progression** button (appears at end of academic year):
  - Confirmation modal before running
  - Increments `intakeYear` context for all non-repeating students
  - Students with `isRepeating = true` are skipped
  - Implemented as a single PATCH to a new admin endpoint: `POST /admin/year-progression`

---

#### 3.7 Department-Aware Home Screen Alerts (Mobile)

Update `HomeScreen.js` to show a context-aware alert strip at the top:

**Students:**
- "X lecturer(s) from your department are on leave today" — calls `GET /lecturer/on-leave/department/:dept`
- "X new notices for your department" — count from notices response

**Lecturers:**
- "You have X classes today" — derived from schedule response for today's day
- "Your leave request is pending approval" — if any PENDING leave exists

---

### Phase 4.5 — Sign Up, Booking Permissions, Auto-Leave

---

#### 4.5.1 — Self-Registration (Sign Up)

**Decision: students self-register, lecturers are admin-created only.**

A student registering as a lecturer would be a security problem. The fix is simple: the sign-up flow creates a `STUDENT` account only — no role selector exists on the form. Lecturers are still added by admin via the Lecturer Management page (Phase 4). Admin accounts are seeded manually, never via sign-up.

**Backend — `src/routes/auth.js`:**

Add a new route alongside the existing `POST /auth/login`:

```
POST /auth/register
```

Body:
```json
{
  "name": "Tenzin Dorji",
  "studentId": "STD220001",
  "email": "std22001@cst.edu.bt",
  "password": "somepassword",
  "department": "SOFTWARE_ENGINEERING",
  "intakeYear": 2022,
  "semester": 2
}
```

Rules:
- `role` is hardcoded to `STUDENT` on the server — never taken from the request body
- `email` and `studentId` must be unique — return a clear `400` error if either already exists
- Password is hashed with `bcrypt` before saving (same as existing seed)
- Returns a JWT on success (same shape as login response) so the user is logged in immediately after registering
- `programme` defaults to `null` — student can update later from profile screen

**Mobile — `src/screens/RegisterScreen.js`:**

New screen. Fields:
- Full Name
- Student ID (e.g. `STD220001`)
- Email
- Department (dropdown using the Department enum values)
- Intake Year (number input, e.g. `2022`)
- Semester (1–8 selector)
- Password
- Confirm Password (client-side match check only)

On submit:
- `POST /auth/register` with the form data
- On success: store JWT + user object in AuthContext (same as login), navigate to student tabs
- On error: show the server's message inline (e.g. "Student ID already registered")

**Navigation — `src/navigation/AppNavigator.js`:**

Add a "Sign Up" link on the Login screen that navigates to `RegisterScreen`. The `AuthStack` gains a new `Register` screen. No changes needed to tab navigation.

**No changes needed to:**
- Admin dashboard — lecturers are still created there
- Existing `POST /auth/login` route
- Any existing JWT middleware

---

#### 4.5.2 — Booking Permissions by Role

**Current problem:** students can book any facility including the Conventional Hall and classrooms. That should be restricted to lecturers.

**Booking permission matrix:**

| Role | Can book |
|---|---|
| Student | Basketball court only |
| Lecturer | Any facility |
| Admin | Any facility |

**Backend — `src/routes/bookings.js`:**

On `POST /bookings`, after authenticating the user, add a permission check before creating the booking:

```js
const STUDENT_ALLOWED_FACILITIES = ['basketball']; // facilityKey values

if (req.user.role === 'STUDENT') {
  if (!STUDENT_ALLOWED_FACILITIES.includes(body.facilityKey)) {
    return res.status(403).json({
      success: false,
      message: 'Students can only book the basketball court.'
    });
  }
}
```

The `facilityKey` values from the seed are: `football`, `hall`, `lab1`, `lab2`, `lab3`, `basketball` (add basketball to seed if not present).

**Mobile — `src/screens/BookingsScreen.js`:**

When the user is a STUDENT, filter the facilities list before rendering — only show basketball court. Do not show a disabled greyed-out list of the other facilities, just hide them entirely. This prevents confusion and also means students never even attempt to book something they cannot.

When the user is a LECTURER or ADMIN, show all facilities as normal.

Add the basketball court to `prisma/seed.js` if it is not already there:
```js
{
  facilityKey: 'basketball',
  name:        'Basketball Court',
  description: 'Outdoor basketball court',
  capacity:    10,
  location:    'Sports Complex',
  color:       'orange',
  icon:        'basketball',
  rules:       ['Book 24hrs in advance', 'Max 2hrs per booking', 'Return equipment after use'],
}
```

---

#### 4.5.3 — Lecturer Leave: Auto-Approval + Auto-Notification ✅ DONE

**Current problem:** when a lecturer submits leave, it goes to `PENDING` and waits for admin to approve. This adds unnecessary admin work for routine leave.

**Implemented:** `POST /lecturer/leave` creates `APPROVED` leave; `createLeaveAnnouncementNotice` posts to notice board (+ SSE + push); mobile shows "Announced" badge; admin leave page remains read-only.

**New behaviour:**
- Lecturer submits leave → status is immediately set to `APPROVED`, not `PENDING`
- A push notification is sent instantly to all students and lecturers
- Admin leave page shows the record as already `APPROVED` — no approve/reject buttons shown for lecturer leave
- Admin can still see all records for visibility

**Backend — `src/routes/lecturer.js`:**

On `POST /lecturer/leave`, change the Prisma create call:

```js
// Before
status: 'PENDING'

// After
status: 'APPROVED'
```

Immediately after saving, call the push notification helper:

```js
await sendLeaveNotification({
  lecturerName: req.user.name,
  department:   req.user.department,
  startDate:    body.startDate,
  endDate:      body.endDate,
  reason:       body.reason,
});
```

**Push notification content:**

```
Title: "Lecturer on Leave"
Body:  "[Lecturer Name] ([Department]) is on leave from [startDate] to [endDate]."
```

Send to: all users (students + lecturers). Use the existing `sendPushNotifications` helper from `src/utils/pushNotifications.js`. Query all users with a stored `pushToken`:

```js
const tokens = await prisma.user.findMany({
  where: { pushToken: { not: null } },
  select: { pushToken: true }
});
```

**Admin Dashboard — `src/pages/LeavePage.jsx`:**

Currently the leave table shows Approve / Reject buttons for `PENDING` leave. Since lecturer leave now arrives as `APPROVED`, hide those buttons when `status === 'APPROVED'`. Show a green `Approved` badge instead. The admin can still see all records — they just cannot approve/reject what is already done.

If admin-submitted leave (from other roles or future types) still needs approval, the existing flow is unchanged for those.

---

### Phase 5 — Advanced Features

#### 3.8 Attendance Tracking

**Backend routes — `src/routes/attendance.js`:**

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/attendance/my` | Student | Own attendance summary — percentage per subject, at-risk flag |
| GET | `/attendance/subject/:scheduleId` | Lecturer | Full attendance history for one of their subjects |
| GET | `/attendance/subject/:scheduleId/today` | Lecturer | Student list for marking today |
| POST | `/attendance` | Lecturer | Submit batch: `[{ studentId, status }]` for a scheduleId + date |
| GET | `/attendance/report` | Admin | Full report filterable by dept, year, subject |
| GET | `/attendance/atrisk` | Admin | Students below 80% in any subject |

**Attendance percentage calculation:**
```
totalSessions = COUNT records for this student + scheduleId
attended      = COUNT where status = PRESENT or LATE
percentage    = (attended / totalSessions) * 100
atRisk        = percentage < 80   → amber warning
barred        = percentage < 75   → red alert
```

**Mobile — `src/screens/AttendanceScreen.js`:**

Students:
- List of subjects with attendance percentage, colour coded (green ≥80%, amber 75–79%, red <75%)
- Tap to see date-by-date breakdown per session

Lecturers:
- List of their assigned subjects
- Tap to mark today's attendance: student list with toggle Present/Absent/Late per student
- Submit saves all records at once
- View past records, see at-risk students highlighted

**Admin Dashboard — `src/pages/AttendancePage.jsx`:**
- Department + Year + Subject + Academic Year filters
- Table: all students with percentage per subject, colour coded
- Export to CSV button

---

#### 3.9 Lost and Found

**Backend routes — `src/routes/lostfound.js`:**

| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/lostfound` | All | All open posts, filterable by type (LOST/FOUND) |
| GET | `/lostfound/my` | Authenticated | Own posted items |
| POST | `/lostfound` | Student + Lecturer | Post item with optional Cloudinary image |
| PATCH | `/lostfound/:id/claim` | Student + Lecturer | Mark as claimed |
| PATCH | `/lostfound/:id/resolve` | Poster or Admin | Mark as resolved |
| DELETE | `/lostfound/:id` | Poster or Admin | Delete post |

**Mobile — `src/screens/LostFoundScreen.js`:**
- Two tabs: Lost / Found
- Cards: title, description, location, date posted, poster name, optional photo
- Post button: type, title, description, location, optional photo upload
- Tap card for detail + Claim / I Found It button
- Own posts show Resolve / Delete option

**Admin Dashboard — `src/pages/LostFoundPage.jsx`:**
- Table: type, title, posted by, department, date, status
- Filter by type and status
- Mark Resolved / Closed, delete inappropriate posts

---

## 4. Tab Navigation — Target State

```
Students  → Home · Schedule · Notices · Bookings · Attendance · Lost&Found · Profile
Lecturers → Home · Schedule · Contacts · Notices · Leave · Attendance · Profile
Admins    → Home · Contacts · Schedule · Notices · Bookings · Leave · Profile
```

Current state (Phase 2 + 3 complete):
```
Students  → Home · Contacts · Schedule · Notices · Bookings
Lecturers → Home · Schedule · Contacts · Notices · Leave
Admins    → Dashboard web: Home · Bookings · Schedule · Notices · Leave · Facilities
            (+ mobile AdminTabs if logged in as ADMIN on app)
```
Phase 4/5 tabs not yet added: Attendance, Lost&Found, Profile

---

## 5. All Files — Change Status

### Backend
| File | Status |
|---|---|
| `prisma/schema.prisma` | ✅ Complete — all Phase 1–5 models in schema |
| `prisma/seed.js` | ✅ Updated for all new fields and enums |
| `prisma/import-students.js` | ✅ Updated for intakeYear, semester, isRepeating, Department enum |
| `prisma/import-lecturers.js` | ✅ Updated for designation, officeHours, Department + Designation enums |
| `src/routes/schedule.js` | ✅ Phase 2 complete — role-aware, admin CRUD, 4 bugs fixed |
| `src/routes/lecturer.js` | ✅ Phase 2 + 4.5.3 — auto-approve leave on submit, college push notify |
| `src/routes/notices.js` | ✅ Phase 2 complete — targetType filtering, auth loads user profile for targeting |
| `src/routes/upload.js` | ✅ Phase 3 — multipart upload (local `./uploads/` or Cloudinary) |
| `src/routes/users.js` | ✅ Phase 3 — `POST /push-token`; 🔲 Phase 4 profile routes |
| `src/utils/pushNotifications.js` | ✅ Phase 3 — Expo send helper + all triggers wired |
| `src/routes/auth.js` | ✅ login exists; 🔲 Phase 4.5 — add `POST /auth/register` |
| `src/routes/bookings.js` | 🔲 Phase 4.5 — add role-based permission check on POST |
| `src/routes/lostfound.js` | 🔲 Phase 5 — all lost and found routes |
| `src/index.js` | ✅ Upload mounted; 🔲 users, notifications, attendance, lostfound when built |

### Admin Dashboard
| File | Status |
|---|---|
| `src/pages/SchedulePage.jsx` | ✅ Phase 2 complete — timetable grid, assign lecturers, 6 bugs fixed |
| `src/pages/LeavePage.jsx` | ✅ Phase 2 complete — approve/reject, status filters, dept filter |
| `src/pages/NoticesPage.jsx` | ✅ Phase 2 + 3 — target selector, file upload (JPG/PNG/PDF/DOC/DOCX) |
| `src/pages/LecturersPage.jsx` | 🔲 Phase 4 — lecturer management |
| `src/pages/StudentsPage.jsx` | 🔲 Phase 4 — student management + bulk year progression |
| `src/pages/AttendancePage.jsx` | 🔲 Phase 5 — attendance overview |
| `src/pages/LostFoundPage.jsx` | 🔲 Phase 5 — lost and found management |
| `src/pages/DashboardPage.jsx` | 🔲 Phase 4 — update stats (pending leave, at-risk students, open lost items) |
| `src/components/Layout.jsx` | 🔲 Phase 4 — add nav links for Lecturers, Students pages |

### Mobile App
| File | Status |
|---|---|
| `src/screens/ScheduleScreen.js` | ✅ Phase 2 complete — role-aware, students see timetable, lecturers see teaching schedule |
| `src/screens/MyLeaveScreen.js` | ✅ Phase 2 complete — status badges, leave board section for lecturers |
| `src/screens/NoticeBoardScreen.js` | ✅ Phase 2 + 3 — target labels, image preview, tap to open/download files |
| `src/screens/RegisterScreen.js` | 🔲 Phase 4.5 — new sign-up screen (student only) |
| `src/screens/BookingsScreen.js` | 🔲 Phase 4.5 — filter facilities by role (students see basketball only) |
| `src/screens/HomeScreen.js` | 🔲 Phase 4 — department-aware alert strip |
| `src/screens/AttendanceScreen.js` | 🔲 Phase 5 — student view + lecturer marking UI |
| `src/screens/LostFoundScreen.js` | 🔲 Phase 5 — lost and found board + post form |
| `src/navigation/AppNavigator.js` | ✅ Phase 2 — role tabs incl. lecturer Schedule; 🔲 Phase 4/5 Profile, Attendance, LostFound |
| `src/context/AuthContext.js` | ✅ Phase 3 — register push token on login / app reopen |
| `src/utils/registerPushToken.js` | ✅ Phase 3 — Expo permissions + `POST /users/push-token` |

---

## 6. Suggested Prompts for Next Chat

Copy a prompt below and paste it with both `progress.md` and `futureprogress.md`:

- *"Help me set up Phase 0 deployment — move my PostgreSQL database to Neon and deploy my Hono backend to Railway so my EAS APK build can reach the API"*
- *"Build Phase 4.5: add student self-registration — new RegisterScreen on mobile and POST /auth/register backend route. Students only, no role selector, logs in immediately after registering"*
- *"Build Phase 4.5: enforce booking permissions — students can only book the basketball court, lecturers can book any facility. Add the check to the backend route and filter the mobile facilities list by role"*
- *"Build Phase 4.5: auto-approve lecturer leave — set status to APPROVED immediately on submit, send push notification to all users with lecturer name, department, and leave dates"*
- *"Build Phase 4: profile screen for mobile app — student and lecturer views with inline editing"*
- *"Build Phase 4: lecturer management page for admin dashboard"*
- *"Build Phase 4: student management page for admin dashboard with bulk year progression"*
- *"Build Phase 4: department-aware home screen alerts for mobile"*
- *"Build Phase 5: attendance tracking system — backend routes, lecturer marking UI, student percentage view, at-risk alerts, admin overview page"*
- *"Build Phase 5: lost and found system — backend routes, mobile screen, admin management page"*

---

*Created: May 2026 | CST, RUB — SWE201 Programming Assignment 1*
*Campus Companion v4.0 — Phase 1 + Phase 2 + Phase 3 complete*
*Last updated: Phase 4.5 added — sign-up, booking permissions, auto-leave*