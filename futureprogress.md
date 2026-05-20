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
| 10 | Student year was a manual field | Replaced with `intakeYear` + `deriveCurrentYear()` calculating year automatically |
| 11 | No department head concept | `Designation` enum: HEAD_OF_DEPARTMENT, SENIOR_LECTURER, LECTURER, LAB_TECHNICIAN, ADMIN_STAFF |
| 12 | No academic year tracking | `academicYear` field added to Schedule and Booking; `academicYear` on LecturerLeave |

### 🔲 Still To Do
| # | Issue | Phase |
|---|---|---|
| 7 | Notices go to everyone | Phase 2 (last remaining item) |
| 8 | No file/image attachments on notices | Phase 3 |
| 9 | No push notifications | Phase 3 |
| 13 | No attendance tracking | Phase 5 |
| 14 | No lost and found system | Phase 5 |

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
- `Notice` — targeting fields in schema, targeting logic in routes **not yet implemented**
- `Attachment` — model in schema, Cloudinary integration **not yet built**
- `Attendance` — model in schema, all routes **not yet built** (Phase 5)
- `LostFound` — model in schema, all routes **not yet built** (Phase 5)

---

## 3. Remaining Work — Detailed Specs

---

### Phase 2 — One Item Remaining

#### 3.1 Notice Targeting (Backend + Admin Dashboard + Mobile)

**Backend — update `GET /notices` in `src/routes/notices.js`:**

Currently returns all notices to everyone. Must filter server-side based on the requesting user:

```js
// Pseudo-logic for GET /notices
const user = c.get('user')

const notices = await prisma.notice.findMany({
  where: {
    OR: [
      { targetType: 'EVERYONE' },
      { targetType: 'DEPARTMENT', targetDepartment: user.department },
      { targetType: 'YEAR_GROUP',
        targetDepartment: user.department,
        targetYear: user.role === 'STUDENT' ? deriveCurrentYear(user.intakeYear) : undefined },
      { targetType: 'ROLE_ONLY',
        targetRole: user.role === 'STUDENT' ? 'STUDENTS_ONLY' : 'LECTURERS_ONLY' },
    ]
  },
  orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
  include: { sentBy: { select: { id: true, name: true } }, attachments: true }
})
```

**Admin Dashboard — update `NoticesPage.jsx`:**
- Add **Target** selector to the create/edit modal:
  - Everyone (default)
  - Specific Department → show Department dropdown
  - Specific Year Group → show Department + Year dropdowns
  - Lecturers Only
  - Students Only
- Notice cards in the list show a target badge so admin can see who it was sent to
- Pass `targetType`, `targetDepartment`, `targetYear`, `targetRole` in POST/PATCH body

**Mobile — `NoticeBoardScreen.js`:**
- No change needed — backend now filters correctly so the screen just shows what it receives
- Optionally show a small "For your department" or "For Year 3" label on notice cards

---

### Phase 3 — Communications

#### 3.2 File Attachments on Notices

**External service: Cloudinary (free tier)**
```
# Add to .env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
```bash
npm install cloudinary multer
```

**New backend route — `src/routes/upload.js`:**
```
POST /upload   Admin only
  - Accepts multipart/form-data with a file field
  - Uploads to Cloudinary
  - Returns: { fileUrl, fileName, fileType, fileSize }
```

**Updated `POST /notices`:**
- Accept `attachments` array in body: `[{ fileUrl, fileName, fileType, fileSize }]`
- Create Attachment records linked to the notice after notice creation

**Updated `DELETE /notices/:id`:**
- Before deleting, fetch all Attachment records
- Call Cloudinary delete API for each fileUrl
- Then delete notice (Attachment records cascade)

**Admin Dashboard — `NoticesPage.jsx`:**
- File upload area in create/edit modal (drag and drop or browse)
- Supports: JPG, PNG, PDF, DOC, DOCX
- Show file preview list: icon, name, size, remove button
- Upload files to `/upload` first → get URLs → include in notice POST body

**Mobile — `NoticeBoardScreen.js`:**
- Notice cards show paperclip icon + file count if attachments exist
- Notice detail screen shows:
  - Inline image preview for IMAGE type
  - Download button for PDF and DOCUMENT type
  - Sender name and send date

---

#### 3.3 Push Notifications

**New backend route — `src/routes/users.js`:**
```
POST /users/push-token   Authenticated
  - Body: { pushToken: string }
  - Updates User.pushToken for current user
```

**Mobile — `AuthContext.js`:**
```js
// On login success, register push token
import * as Notifications from 'expo-notifications'
const token = await Notifications.getExpoPushTokenAsync()
await api.post('/users/push-token', { pushToken: token.data })
```

**Backend notification helper — `src/routes/notifications.js`:**
```js
// Send push notification via Expo push API
async function sendPush(pushToken, title, body) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: pushToken, title, body })
  })
}
```

**All notification triggers:**

| Event | Recipient | Message |
|---|---|---|
| Leave approved | Lecturer who submitted | "Your leave request has been approved" |
| Leave rejected | Lecturer who submitted | "Your leave request was rejected" |
| Booking approved | Student who booked | "Your booking for {facility} has been approved" |
| Booking rejected | Student who booked | "Your booking for {facility} was rejected" |
| New notice published | All users in target group | "New notice: {title}" |
| Attendance drops below 80% | Student | "Warning: Your attendance in {subject} is at {pct}%" |
| Attendance drops below 75% | Student | "Critical: You are at risk of being barred from {subject} exam" |
| Lecturer approved leave | Students who have that lecturer | "{name} is on leave from {start} to {end}" |

Wire push calls into existing approve/reject routes — no new endpoints needed for most triggers.

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

Current state (after Phase 2):
```
Students  → Home · Schedule · Notices · Bookings (no Attendance, LostFound, Profile yet)
Lecturers → Home · Schedule · Contacts · Notices · Leave (no Attendance, Profile yet)
Admins    → Dashboard (web only)
```

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
| `src/routes/lecturer.js` | ✅ Phase 2 complete — approval workflow, /leave/all endpoint |
| `src/routes/notices.js` | 🔲 Phase 2 remaining — add targetType filtering to GET /notices |
| `src/routes/upload.js` | 🔲 Phase 3 — new Cloudinary upload endpoint |
| `src/routes/users.js` | 🔲 Phase 4 — profile get/update, push token save |
| `src/routes/notifications.js` | 🔲 Phase 3 — push notification helper |
| `src/routes/attendance.js` | 🔲 Phase 5 — all attendance routes |
| `src/routes/lostfound.js` | 🔲 Phase 5 — all lost and found routes |
| `src/index.js` | 🔲 Mount new routes as built (upload, users, notifications, attendance, lostfound) |

### Admin Dashboard
| File | Status |
|---|---|
| `src/pages/SchedulePage.jsx` | ✅ Phase 2 complete — timetable grid, assign lecturers, 6 bugs fixed |
| `src/pages/LeavePage.jsx` | ✅ Phase 2 complete — approve/reject, status filters, dept filter |
| `src/pages/NoticesPage.jsx` | 🔲 Phase 2 remaining — add target selector to create/edit modal |
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
| `src/screens/NoticeBoardScreen.js` | 🔲 Phase 2 remaining — attachment indicator (after backend targeting done) |
| `src/screens/ProfileScreen.js` | 🔲 Phase 4 — new screen |
| `src/screens/HomeScreen.js` | 🔲 Phase 4 — department-aware alert strip |
| `src/screens/AttendanceScreen.js` | 🔲 Phase 5 — student view + lecturer marking UI |
| `src/screens/LostFoundScreen.js` | 🔲 Phase 5 — lost and found board + post form |
| `src/navigation/AppNavigator.js` | 🔲 Phase 4 — add Profile tab; Phase 5 — add Attendance, LostFound tabs |
| `src/context/AuthContext.js` | 🔲 Phase 3 — register push token on login |

---

## 6. Suggested Prompts for Next Chat

Copy a prompt below and paste it with both `progress.md` and `futureprogress.md`:

- *"Finish Phase 2: add notice targeting — update GET /notices to filter by user context and update NoticesPage.jsx with a target selector on the create/edit modal"*
- *"Build Phase 3: set up Cloudinary and add file attachments to notices — upload endpoint, admin modal file upload, mobile attachment viewer"*
- *"Build Phase 3: set up Expo push notifications with all trigger events — push token saving, notification helper, wire into leave and booking approve/reject"*
- *"Build Phase 4: profile screen for mobile app — student and lecturer views with inline editing"*
- *"Build Phase 4: lecturer management page for admin dashboard"*
- *"Build Phase 4: student management page for admin dashboard with bulk year progression"*
- *"Build Phase 4: department-aware home screen alerts for mobile"*
- *"Build Phase 5: attendance tracking system — backend routes, lecturer marking UI, student percentage view, at-risk alerts, admin overview page"*
- *"Build Phase 5: lost and found system — backend routes, mobile screen, admin management page"*

---

*Created: May 2026 | CST, RUB — SWE201 Programming Assignment 1*
*Campus Companion v4.0 — Phase 1 + Phase 2 complete*
*Last updated: Phase 2 schedule rebuild done (6 bugs fixed), leave approval workflow done*
*(One Phase 2 item remaining: notice targeting)*