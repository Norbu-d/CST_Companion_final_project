# Campus Companion — Future Progress & Feature Roadmap

> This file documents all planned updates, new features, data model changes, and system improvements
> discussed and agreed upon for the next phase of development.
>
> Use this file alongside progress.md when continuing in a new Claude chat.
> Paste both files and say:
> **"Continue building my Campus Companion project. Here is the full context and future roadmap."**

---

## 1. Summary of What Needs To Change

The current system has a solid foundation — auth, bookings, notices, leave, and contacts all work.
But the following core problems exist that need to be resolved before adding new features:

1. **Departments are disconnected** — stored as a free text string, not driving any logic
2. **Schedule is static and meaningless** — not linked to department, year, or lecturer
3. **Schedule is students-only** — lecturers should see their own teaching timetable
4. **Admin cannot assign schedules** — admin must be able to create timetables and assign lecturers to classes
5. **Leave has no approval workflow** — submitted leave is instantly treated as approved
6. **Lecturers cannot see each other's leave** — no college-wide leave visibility
7. **Notices go to everyone** — no targeting by department, year, or role
8. **No file/image attachments on notices** — needed for timetables, circulars, official docs
9. **No push notifications** — users have no awareness of new messages or leave
10. **Student year is a manual field** — should be calculated from intake year automatically
11. **No department head concept** — all lecturers look the same regardless of designation
12. **No academic year tracking** — bookings and leave have no academic year context
13. **No attendance tracking** — RUB requires 75% attendance, currently no digital tracking exists
14. **No lost and found system** — students have no way to report or find lost items on campus

---

## 2. Database Schema Changes Required

### 2.1 Department — Must Become An Enum

Currently `department` is a free text `String?` on the User model.
This causes bugs — typos and case differences treat the same department as different.

**Change to an enum with exactly these 9 values:**

```prisma
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
```

Update `User.department` to use this enum.
Update `Schedule.department` (new field) to use this enum.
Update `Notice.targetDepartment` (new field) to use this enum.

---

### 2.2 User Model — Updated Fields

```prisma
model User {
  id             Int              @id @default(autoincrement())
  studentId      String           @unique        // student number for students, employeeId for lecturers
  name           String
  email          String           @unique
  password       String
  role           Role             @default(STUDENT)
  department     Department?                      // CHANGED: now an enum, not free text
  contact        String?                          // phone number

  // Student-specific fields
  intakeYear     Int?                             // NEW: year enrolled e.g. 2022 (replaces 'year')
  semester       Int?                             // NEW: current semester (1 or 2)
  programme      String?                          // NEW: specific programme within department
  isRepeating    Boolean          @default(false) // NEW: true if student is repeating a year

  // Lecturer-specific fields
  designation    Designation?                     // NEW: role within department (HOD, Senior Lecturer etc)
  officeHours    String?                          // NEW: moved from hardcoded backend to actual DB field

  // Notification
  pushToken      String?                          // NEW: Expo push notification token

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

enum Designation {
  HEAD_OF_DEPARTMENT
  SENIOR_LECTURER
  LECTURER
  LAB_TECHNICIAN
  ADMIN_STAFF
}
```

**Migration note:**
- `year` field (old) → replaced by `intakeYear` (calculated automatically)
- Current year formula: `currentYear = currentAcademicYear - intakeYear + 1`
- Students who are repeating a year have `isRepeating = true` and their year does not auto-increment

---

### 2.3 Schedule Model — Complete Rebuild

Current schedule is one global timetable. Must be rebuilt to support department + year + lecturer.
**Admin creates all schedule entries and assigns a lecturer to each one.**

```prisma
model Schedule {
  id           Int          @id @default(autoincrement())
  department   Department                     // which department this class is for
  year         Int                            // which student year (1, 2, 3, 4)
  semester     Int                            // which semester (1 or 2)
  academicYear String                         // e.g. "2025-26"
  day          String                         // Monday, Tuesday etc
  time         String                         // e.g. "08:00–09:50"
  subject      String                         // subject name
  room         String                         // room or lab
  type         String                         // Lecture, Lab, Tutorial
  lecturerId   Int?                           // assigned by admin — links to User (lecturer)
  lecturer     User?        @relation("LecturerSchedule", fields: [lecturerId], references: [id])
  attendances  Attendance[]
}
```

**How it works:**
- Admin opens Schedule Management page in the dashboard
- Selects department (e.g. Software Engineering) and year (e.g. Year 3)
- Creates class entries and assigns a lecturer from a dropdown of lecturers in that department
- Students in Year 3 Software Engineering automatically see all entries where
  `department = SOFTWARE_ENGINEERING AND year = 3`
- A lecturer sees all entries where `lecturerId = their own id` — their personal teaching timetable
- Admin can edit or delete any entry at any time — changes reflect immediately

---

### 2.4 LecturerLeave Model — Add Approval Workflow

```prisma
model LecturerLeave {
  id           Int           @id @default(autoincrement())
  userId       Int
  startDate    DateTime
  endDate      DateTime
  reason       String?
  status       LeaveStatus   @default(PENDING)   // NEW: approval workflow
  approvedById Int?                               // NEW: which admin approved/rejected
  academicYear String?                            // NEW: e.g. "2025-26"
  createdAt    DateTime      @default(now())
  user         User          @relation(fields: [userId], references: [id])
  approvedBy   User?         @relation("ApprovedBy", fields: [approvedById], references: [id])
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**How it works:**
- Lecturer submits leave → status = PENDING
- Admin approves → status = APPROVED → now visible to students and other lecturers
- Admin rejects → status = REJECTED → lecturer sees rejection, nothing shown to others
- `GET /lecturer/on-leave` only returns APPROVED leave

---

### 2.5 Notice Model — Add Targeting, Sender and Attachments

```prisma
model Notice {
  id               Int            @id @default(autoincrement())
  title            String
  body             String
  category         String
  pinned           Boolean        @default(false)
  icon             String         @default("megaphone")
  date             DateTime       @default(now())

  // Targeting
  targetType       TargetType     @default(EVERYONE)
  targetDepartment Department?    // set when targetType = DEPARTMENT or YEAR_GROUP
  targetYear       Int?           // set when targetType = YEAR_GROUP
  targetRole       TargetRole?    // set when targetType = ROLE_ONLY

  // Sender
  sentById         Int?
  sentBy           User?          @relation("SentBy", fields: [sentById], references: [id])

  // Attachments
  attachments      Attachment[]
}

enum TargetType {
  EVERYONE
  DEPARTMENT
  YEAR_GROUP
  ROLE_ONLY
}

enum TargetRole {
  LECTURERS_ONLY
  STUDENTS_ONLY
}
```

---

### 2.6 Attachment Model — New

```prisma
model Attachment {
  id        Int            @id @default(autoincrement())
  noticeId  Int
  fileUrl   String                  // Cloudinary URL
  fileName  String                  // original file name e.g. "timetable_IT_Y3.pdf"
  fileType  AttachmentType
  fileSize  Int                     // in bytes
  createdAt DateTime       @default(now())
  notice    Notice         @relation(fields: [noticeId], references: [id], onDelete: Cascade)
}

enum AttachmentType {
  IMAGE
  PDF
  DOCUMENT
}
```

---

### 2.7 Booking Model — Add Academic Year

```prisma
model Booking {
  id           Int           @id @default(autoincrement())
  userId       Int
  facilityId   Int
  date         String
  slots        Int[]
  purpose      String
  status       BookingStatus @default(PENDING)
  academicYear String?                            // NEW: e.g. "2025-26"
  createdAt    DateTime      @default(now())
  facility     Facility      @relation(fields: [facilityId], references: [id])
  user         User          @relation(fields: [userId], references: [id])
}
```

---

### 2.8 Attendance Model — New (Phase 5)

Attendance is linked to a specific schedule entry and a specific student.
Because all students in the same department and year share the same schedule,
enrollment is automatic — no separate enrollment model needed.

```prisma
model Attendance {
  id           Int              @id @default(autoincrement())
  studentId    Int                               // which student
  scheduleId   Int                               // which class session
  date         DateTime                          // which date this session was held
  status       AttendanceStatus @default(ABSENT)
  markedById   Int?                              // which lecturer marked it
  markedAt     DateTime         @default(now())
  academicYear String?
  student      User             @relation(fields: [studentId], references: [id])
  schedule     Schedule         @relation(fields: [scheduleId], references: [id])
  markedBy     User?            @relation("MarkedBy", fields: [markedById], references: [id])

  @@unique([studentId, scheduleId, date])        // one record per student per class per day
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
}
```

**How attendance percentage is calculated:**
```
totalSessions  = count of Attendance records for this student + scheduleId
attended       = count where status = PRESENT or LATE
percentage     = (attended / totalSessions) * 100
atRisk         = percentage < 80   → amber warning
barred         = percentage < 75   → red alert
```

---

### 2.9 LostFound Model — New (Phase 5)

```prisma
model LostFound {
  id            Int             @id @default(autoincrement())
  type          LostFoundType                    // LOST or FOUND
  title         String                           // e.g. "Blue water bottle"
  description   String                           // details about the item
  location      String?                          // where it was lost or found
  imageUrl      String?                          // optional photo uploaded to Cloudinary
  status        LostFoundStatus @default(OPEN)
  reportedById  Int                              // who posted it
  claimedById   Int?                             // who claimed it (if found)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  reportedBy    User            @relation("ReportedBy", fields: [reportedById], references: [id])
  claimedBy     User?           @relation("ClaimedBy", fields: [claimedById], references: [id])
}

enum LostFoundType {
  LOST     // student lost something, posting to find it
  FOUND    // student found something, posting so owner can claim
}

enum LostFoundStatus {
  OPEN       // still unresolved
  CLAIMED    // owner has claimed the found item
  RESOLVED   // lost item was found and returned
  CLOSED     // admin closed the post
}
```

---

## 3. New and Updated Backend Routes

### 3.1 Schedule Routes — Complete Rebuild
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/schedule` | Student + Lecturer | Student: returns schedule for their department+year. Lecturer: returns their assigned classes |
| GET | `/schedule/department/:dept/year/:year` | Admin | Full timetable for a specific department and year |
| POST | `/schedule` | Admin only | Create a new schedule entry and assign a lecturer |
| PATCH | `/schedule/:id` | Admin only | Edit a schedule entry including reassigning lecturer |
| DELETE | `/schedule/:id` | Admin only | Delete a schedule entry |

### 3.2 Leave Routes — Updated
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/lecturer/leave/all` | All roles | All leave records across all lecturers with department info |
| GET | `/lecturer/on-leave` | All roles | Only APPROVED leave active today |
| GET | `/lecturer/on-leave/department/:dept` | All roles | On-leave lecturers filtered by department |
| PATCH | `/lecturer/leave/:id/status` | Admin only | Approve or reject a leave request |
| POST | `/lecturer/leave` | Lecturer + Admin | Submit leave — status starts as PENDING |
| DELETE | `/lecturer/leave/:id` | Lecturer (own) + Admin | Cancel leave |

### 3.3 Notice Routes — Updated
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/notices` | All roles | Returns notices targeted to requesting user based on their department, year, role |
| POST | `/notices` | Admin only | Create notice with targeting and attachments |
| PATCH | `/notices/:id` | Admin only | Edit notice |
| DELETE | `/notices/:id` | Admin only | Delete notice and remove attachments from Cloudinary |

### 3.4 File Upload Route — New
| Method | Route | Who | Description |
|---|---|---|---|
| POST | `/upload` | Admin only | Upload image or file to Cloudinary, returns fileUrl, fileName, fileType, fileSize |

### 3.5 Push Notification Route — New
| Method | Route | Who | Description |
|---|---|---|---|
| POST | `/users/push-token` | Authenticated | Save or update Expo push token for current user |

### 3.6 User Profile Routes — New
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/users/me` | Authenticated | Get own full profile |
| PATCH | `/users/me` | Authenticated | Update own profile (office hours for lecturers, contact etc) |

### 3.7 Attendance Routes — New (Phase 5)
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/attendance/my` | Student | Own attendance summary — percentage per subject, at-risk flag |
| GET | `/attendance/subject/:scheduleId` | Lecturer | Full attendance history for one of their subjects |
| GET | `/attendance/subject/:scheduleId/today` | Lecturer | Student list for marking attendance today |
| POST | `/attendance` | Lecturer | Submit attendance for a class session — array of { studentId, status } |
| GET | `/attendance/report` | Admin | Full attendance report filterable by department, year, subject |
| GET | `/attendance/atrisk` | Admin | All students below 80% in any subject |

### 3.8 Lost and Found Routes — New (Phase 5)
| Method | Route | Who | Description |
|---|---|---|---|
| GET | `/lostfound` | All roles | All open lost and found posts — filterable by type (LOST/FOUND) |
| GET | `/lostfound/my` | Authenticated | Own posted items |
| POST | `/lostfound` | Student + Lecturer | Post a lost or found item with optional image |
| PATCH | `/lostfound/:id/claim` | Student + Lecturer | Mark an item as claimed |
| PATCH | `/lostfound/:id/resolve` | Poster or Admin | Mark post as resolved |
| DELETE | `/lostfound/:id` | Poster or Admin | Delete a post |

---

## 4. Mobile App Changes Required

### 4.1 Schedule Screen — Complete Rebuild
- Currently shows static hardcoded data — completely useless
- Must call `GET /schedule` which returns only relevant data for the logged-in user
- **Students** see their department + year timetable with lecturer name on each class
- **Lecturers** see only the classes they are assigned to teach — their personal teaching timetable
  - Shows which department and year they are teaching for each class
  - Example: "Cross Platform Development — Year 3 Software Engineering — Lab 2"
- Display: day selector at top, classes listed for selected day
- If a lecturer assigned to a class is on approved leave — show a subtle "Lecturer on Leave" indicator on that class card for students

### 4.2 Leave Screen — Major Update
- Lecturer's own submitted leaves show with status badges:
  - PENDING → amber badge "Awaiting Approval"
  - APPROVED → green badge "Approved"
  - REJECTED → red badge "Rejected"
- **New section: College Leave Board** — visible to all lecturers
  - Shows all lecturers currently on APPROVED leave across all departments
  - Shows name, department, leave dates, reason
  - Lecturers can see this to know who among their colleagues is away
- Students: home screen shows a small alert if any lecturer who teaches them is currently on approved leave

### 4.3 Notices Screen — Updated
- Backend now filters notices server-side based on user's department/year/role
- Notice cards show attachment indicator — paperclip icon with file count
- Notice detail screen shows:
  - Full body text
  - Inline image preview for IMAGE attachments
  - Download button for PDF and DOCUMENT attachments
  - Sender name and send date

### 4.4 Home Screen — Updated
- Department-aware alert strip:
  - Students: "X lecturer(s) from your department are on leave today"
  - Students: "X new notices for your department"
  - Lecturers: "You have X classes today"
  - Lecturers: "X pending leave requests" (if any)
- Stats cards reflect real data for the logged-in user's context

### 4.5 Attendance Screen — New (Phase 5)

**For Students:**
- List of all their subjects with attendance percentage per subject
- Colour coded: green (≥80%), amber (75–79% — at risk), red (<75% — barred risk)
- Tap a subject to see full date-by-date breakdown — present, absent, late per session
- Push notification when percentage drops below 80% in any subject

**For Lecturers:**
- List of their assigned subjects (from schedule)
- Tap a subject to mark today's attendance:
  - Shows list of all students in that department and year
  - Tap each student to toggle Present / Absent / Late
  - Submit button saves all records at once
- View past attendance records per subject
- See which students are at risk (below 80%) highlighted in amber

### 4.6 Lost and Found Screen — New (Phase 5)
- Two tabs: **Lost** and **Found**
- Each tab shows open posts as cards with: item name, description, location, date posted, poster name
- Optional photo shown if uploaded
- **Post button** — form to post a lost or found item:
  - Type (Lost or Found)
  - Title and description
  - Location (where lost or where found)
  - Optional photo upload
- Tap any card to see full details and a **Claim / I Found It** button
- Own posts show a Resolve / Delete button
- Posts automatically close after admin marks them resolved or closed

### 4.7 Profile Screen — New
- Students: name, student ID, department, current year (calculated from intakeYear), semester, email, contact
- Lecturers: name, employee ID, department, designation, office hours (editable inline), email, contact
- Edit button for fields the user can update themselves (contact number, office hours for lecturers)

### 4.8 AppNavigator — Updated Tab Sets
```
Students  → Home, Schedule, Notices, Bookings, Attendance, Lost&Found, Profile
Lecturers → Home, Schedule, Contacts, Notices, Leave, Attendance, Profile
Admins    → Home, Contacts, Schedule, Notices, Bookings, Leave, Profile
```

**Important schedule note:**
- Both students and lecturers now have the Schedule tab
- What they see is completely different — students see their class timetable, lecturers see their teaching timetable
- The same `ScheduleScreen.js` handles both by checking the user's role from AuthContext

---

## 5. Admin Dashboard Changes Required

### 5.1 Schedule Management Page — New
- Route: `/schedule`
- Department + Year + Semester + Academic Year selectors at top
- Weekly timetable grid — rows = time slots, columns = days (Mon–Sat)
- Empty slots are clickable to add a new class
- Existing class cards show: subject, room, type, assigned lecturer name
- Click existing class to edit or delete
- **Assign Lecturer dropdown** — shows all lecturers in the selected department
- Admin can reassign a lecturer to a different class at any time
- Changes go live immediately for students and lecturers

### 5.2 Leave Management Page — Updated
- Add APPROVE / REJECT buttons on PENDING leave rows — same pattern as bookings page
- Filter tabs: All / Pending / Approved / Rejected
- Filter by department
- Academic year filter
- On approval or rejection — push notification automatically sent to the lecturer

### 5.3 Notice Creation — Major Update
- Target selector: Everyone / Specific Department / Specific Year Group / Lecturers Only / Students Only
- When Department selected: show department dropdown
- When Year Group selected: show department + year dropdowns
- File upload area — drag and drop or click to browse
- Supports: JPG, PNG, PDF, DOC, DOCX
- Preview uploaded files before sending with file name, type icon, size and remove button
- Files uploaded to Cloudinary first, then notice created with returned attachment URLs
- Pinned toggle for important notices

### 5.4 Lecturer Management Page — New
- Route: `/lecturers`
- Table of all lecturers: name, employee ID, department, designation, email, contact, office hours
- Filter by department
- Add new lecturer — creates User with LECTURER role
- Edit lecturer — change designation, department, office hours
- When a new Head of Department is assigned the previous HOD's designation automatically reverts to LECTURER
- View lecturer's leave history and current assigned schedule

### 5.5 Student Management Page — New
- Route: `/students`
- Table of all students: name, student ID, department, intake year, calculated current year, semester, isRepeating flag
- Filter by department and year
- Edit student — update semester, toggle isRepeating flag
- **Bulk Year Progression** — button that appears at end of academic year
  - Increments intakeYear context for all non-repeating students automatically
  - Students with isRepeating = true are skipped
  - Confirmation modal before running

### 5.6 Attendance Overview Page — New (Phase 5)
- Route: `/attendance`
- Department + Year + Subject + Academic Year filters
- Table showing all students with their attendance percentage per subject
- Colour coded rows: green (safe), amber (at risk), red (barred risk)
- Export to CSV button for official records
- Click a student to see their full attendance breakdown per subject

### 5.7 Lost and Found Management Page — New (Phase 5)
- Route: `/lostfound`
- Table of all posts: type (Lost/Found), title, posted by, department, date, status
- Filter by type and status
- Admin can mark any post as Resolved or Closed
- Delete inappropriate posts

### 5.8 Dashboard Page — Updated Stats
- Pending bookings (exists)
- **Pending leave requests** (changed from on-leave count — shows what needs action)
- New notices sent this week
- Students at risk of attendance barring (below 80%) — new
- Open lost and found posts — new
- Total students and lecturers breakdown by department — new

---

## 6. New External Services Required

### 6.1 Cloudinary — File Storage
- Free tier sufficient for a college project
- Used for: notice attachments (images, PDFs, documents), lost and found item photos
- Setup: create free account at cloudinary.com
- Add to `.env`:
  ```
  CLOUDINARY_CLOUD_NAME=your_cloud_name
  CLOUDINARY_API_KEY=your_api_key
  CLOUDINARY_API_SECRET=your_api_secret
  ```
- Install: `npm install cloudinary multer`

### 6.2 Expo Push Notifications — Push Service
- Free, built into Expo ecosystem
- Used for: new notice alerts, leave approval/rejection, booking status changes, attendance warnings
- Install in mobile app: `expo install expo-notifications`
- Each device registers a push token stored in User.pushToken

---

## 7. Notification Triggers — Full List

| Event | Who Gets Notified | Message |
|---|---|---|
| New notice published | All users in target group | "New notice: {title}" |
| Leave approved | The lecturer who submitted | "Your leave request has been approved" |
| Leave rejected | The lecturer who submitted | "Your leave request was rejected" |
| Booking approved | The student who booked | "Your booking for {facility} has been approved" |
| Booking rejected | The student who booked | "Your booking for {facility} was rejected" |
| Attendance drops below 80% | The student | "Warning: Your attendance in {subject} is at {percentage}%" |
| Attendance drops below 75% | The student | "Critical: You are at risk of being barred from {subject} exam" |
| Lecturer on approved leave | Students who have that lecturer | "{lecturer name} is on leave from {date} to {date}" |

---

## 8. Data Migration Plan

When implementing these changes on existing data:

**Step 1 — Department enum migration**
- Export all users
- Map existing department strings to enum values
- Run migration
- Re-import with correct enum values

**Step 2 — Student year migration**
- Determine intake year from existing `year` field
- Formula: `intakeYear = currentAcademicStartYear - year + 1`
- Set intakeYear on all student records
- Set isRepeating = false on all existing students by default

**Step 3 — Lecturer designation migration**
- Default all existing lecturers to `LECTURER` designation
- Manually update Head of Department for each department via admin dashboard after launch

**Step 4 — Leave status migration**
- All existing leave records → set status to `APPROVED`
- Future leave submissions start as `PENDING`

**Step 5 — Schedule rebuild**
- Delete all existing static schedule entries
- Admin recreates all schedules per department and year via dashboard
- Assigns a lecturer to each entry

---

## 9. Implementation Priority Order

### Phase 1 — Data Foundation (Do First — Nothing Else Works Without This)
1. Department enum — update schema and all import scripts
2. Add to User: intakeYear, isRepeating, semester, programme, designation, officeHours, pushToken
3. Add status, approvedById, academicYear to LecturerLeave
4. Add targetType, targetDepartment, targetYear, sentById to Notice
5. Add Attachment model
6. Rebuild Schedule model — add department, year, semester, academicYear, lecturerId
7. Add academicYear to Booking
8. Run `npx prisma migrate dev --name phase1_data_foundation`
9. Update seed.js and all import scripts to use new fields

### Phase 2 — Core Feature Updates
1. Leave approval workflow — backend PATCH route + admin dashboard approve/reject buttons
2. Leave visibility for all lecturers — `GET /lecturer/leave/all` + mobile leave board section
3. Schedule rebuild — backend routes + admin schedule management page + mobile schedule screen for both students and lecturers
4. Notice targeting — backend filters by user context on `GET /notices` + admin target selector on creation

### Phase 3 — New Communication Features
1. File attachments on notices — Cloudinary setup + upload endpoint + mobile attachment viewer
2. Push notifications — Expo setup + push token saving + all notification triggers

### Phase 4 — User Features
1. Profile screen — mobile app for students and lecturers
2. Lecturer management page — admin dashboard
3. Student management page with bulk year progression — admin dashboard
4. Department-aware home screen alerts

### Phase 5 — Advanced Features
1. **Attendance tracking** — schema migration, backend routes, lecturer marking UI, student view, at-risk alerts
2. **Lost and Found** — schema migration, backend routes, mobile screen, admin management page

---

## 10. Summary of All New and Changed Files

### Backend
| File | Change |
|---|---|
| `prisma/schema.prisma` | Major update — new enums, new fields, Attendance model, LostFound model, Attachment model |
| `prisma/seed.js` | Update to use Department enum and all new User fields |
| `prisma/import-students.js` | Add intakeYear, semester, programme, isRepeating parsing |
| `prisma/import-lecturers.js` | Add designation, officeHours parsing |
| `src/routes/schedule.js` | Complete rebuild — role-aware, admin assigns lecturers |
| `src/routes/notices.js` | Add targeting logic and attachment handling |
| `src/routes/lecturer.js` | Add leave approval workflow, leave/all endpoint |
| `src/routes/upload.js` | New — Cloudinary file upload endpoint |
| `src/routes/users.js` | New — profile get/update, push token save |
| `src/routes/notifications.js` | New — push notification sending logic |
| `src/routes/attendance.js` | New (Phase 5) — all attendance routes |
| `src/routes/lostfound.js` | New (Phase 5) — all lost and found routes |
| `src/index.js` | Mount new routes: upload, users, notifications, attendance, lostfound |

### Mobile App
| File | Change |
|---|---|
| `src/screens/ScheduleScreen.js` | Complete rebuild — role-aware, students see timetable, lecturers see teaching schedule |
| `src/screens/MyLeaveScreen.js` | Add status badges, add college-wide leave board section for lecturers |
| `src/screens/NoticeBoardScreen.js` | Add attachment indicator, notice detail with file viewer |
| `src/screens/HomeScreen.js` | Add department-aware alert strip |
| `src/screens/ProfileScreen.js` | New screen — students and lecturers |
| `src/screens/AttendanceScreen.js` | New (Phase 5) — student view + lecturer marking UI |
| `src/screens/LostFoundScreen.js` | New (Phase 5) — lost and found board + post form |
| `src/navigation/AppNavigator.js` | Add Schedule back to lecturer tabs, add Profile, Attendance, LostFound tabs |
| `src/context/AuthContext.js` | Store full user profile, register push token on login |

### Admin Dashboard
| File | Change |
|---|---|
| `src/pages/SchedulePage.jsx` | New — timetable grid, assign lecturers to classes |
| `src/pages/LeavePage.jsx` | Add approve/reject buttons, department filter |
| `src/pages/NoticesPage.jsx` | Add targeting selector, file upload in creation modal |
| `src/pages/LecturersPage.jsx` | New — lecturer management |
| `src/pages/StudentsPage.jsx` | New — student management with bulk year progression |
| `src/pages/AttendancePage.jsx` | New (Phase 5) — college-wide attendance overview |
| `src/pages/LostFoundPage.jsx` | New (Phase 5) — lost and found management |
| `src/pages/DashboardPage.jsx` | Update stats — pending leave, at-risk students, open lost items |
| `src/components/Layout.jsx` | Add nav links for all new pages |

---

## 11. Notes For Next Claude Chat

When continuing, paste both `progress.md` and `futureprogress.md` and specify which phase
or feature you want to implement. Suggested prompts:

- *"Implement Phase 1 data foundation — update schema, run migrations, update seed and import scripts"*
- *"Build the leave approval workflow — backend PATCH route and admin dashboard approve/reject"*
- *"Build the leave board for lecturers on the mobile app"*
- *"Rebuild the schedule system — schema, backend routes, admin page, mobile screen for students and lecturers"*
- *"Add notice targeting — backend filtering by user context and admin target selector"*
- *"Set up Cloudinary and add file attachments to notices"*
- *"Set up Expo push notifications with all triggers"*
- *"Build the profile screen for the mobile app"*
- *"Build the lecturer management page for the admin dashboard"*
- *"Build the student management page with bulk year progression"*
- *"Build the attendance tracking system — Phase 5"*
- *"Build the lost and found system — Phase 5"*

---

*Created: May 2026 | CST, RUB — SWE201 Programming Assignment 1*
*This roadmap covers all features planned for Campus Companion v4.0*
*Current working system is v3.0 — see progress.md for what is already complete*
*(Last updated: Added attendance tracking, lost and found, lecturer schedule view,*
*admin assigns lecturers to schedule entries, updated tab navigation for all roles,*
*full notification triggers table, complete file summary)*
