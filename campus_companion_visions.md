# Campus Companion — Project Vision & Reference

> Master reference for the CST Campus Companion system.  
> **Course:** SWE201 PA1 — CST, RUB — 2026  
> **Companion docs:** [`progress1.1.md`](progress1.1.md) (handoff & schema) · [`futureprogress.md`](futureprogress.md) (detailed specs for Phases 4–5)

---

## 0. Project Status at a Glance

| Part | Path | Stack | Status |
|---|---|---|---|
| Mobile app | `CampusCompanion/` | Expo SDK 55 · React Native · JavaScript | Phases 1–3 feature-complete; Phase 4–5 not started |
| Backend API | `campus-companion-backend/` | Node.js · Hono · PostgreSQL · Prisma 7 | Phases 1–3 routes live; SSE + push wired |
| Admin dashboard | `campus-companion-admin/` | Vite · React | Phases 1–3 pages live |

### Phase completion

| Phase | Scope | Status |
|---|---|---|
| **0** | Cloud DB + Railway deploy + EAS APK (`API_BASE` not localhost) | 🔲 **Blocking** — do before real-device rollout |
| **1** | Schema, enums, migrations, imports | ✅ Complete |
| **2** | Schedule rebuild, leave approval, role-aware APIs, admin timetable | ✅ Complete |
| **3** | Notice targeting, attachments, Expo push, **SSE live notices** | ✅ Complete (needs Phase 0 for push on production builds) |
| **4** | Profile, lecturer/student admin pages, home alerts | 🔲 Not started |
| **5** | Attendance, lost & found (schema exists, no routes) | 🔲 Not started |

### Recently implemented (in repo, may be uncommitted)

- **`campus-companion-backend/src/sse.js`** — subscriber map + `broadcastNewNotice()`
- **`GET /notices/live`** — authenticated SSE stream with 30s heartbeat (`notices.js`)
- **Mobile `NoticeBoardScreen.js`** — `react-native-sse` client, auto-reconnect on error
- **`POST /bookings`** — Prisma `$transaction` for FCFS slot conflict (race condition fixed)

---

## 1. Repository Layout

```
CST_companion/
├── CampusCompanion/              # Expo mobile app
│   └── src/
│       ├── api/client.js         # API_BASE (LAN auto-detect; Phase 0 → Railway URL)
│       ├── context/AuthContext.js
│       ├── navigation/AppNavigator.js
│       ├── screens/              # Home, Contacts, Schedule, Notices, Bookings, Leave
│       └── utils/registerPushToken.js
├── campus-companion-backend/
│   └── src/
│       ├── index.js              # Hono app, CORS, route mounting
│       ├── sse.js                # SSE subscriber manager
│       ├── routes/               # auth, contacts, schedule, notices, bookings, lecturer, upload, users
│       └── utils/
│           ├── pushNotifications.js
│           ├── noticeTargeting.js
│           └── deriveCurrentYear.js
├── campus-companion-admin/
│   └── src/pages/                # Dashboard, Bookings, Schedule, Notices, Leave, Facilities
├── progress1.1.md                # Full handoff (schema, credentials, bugs fixed)
└── futureprogress.md             # Phase 4–5 specs + Phase 0 deployment steps
```

### Mobile tab navigation (current)

```
Students  → Home · Contacts · Schedule · Notices · Bookings
Lecturers → Home · Schedule · Contacts · Notices · Leave
```

**Target (after Phase 4–5):** add Profile, Attendance, Lost & Found — see `futureprogress.md` §4.

---

## 2. Tech Stack Assessment

### What you built

A deployable three-part campus system:

- **Mobile** — Expo SDK 55 + React Native (JavaScript), `react-native-sse` for live notices
- **Backend** — Node.js + Hono + PostgreSQL + Prisma 7 (`@prisma/adapter-pg`, config in `prisma/prisma.config.js`)
- **Admin** — Vite + React + React Query

### TypeScript?

Reasonable to adopt on the **next** project. Several Phase 2 bugs (`lecturerId` coercion, semester comparison) would have been caught earlier with types. **Do not migrate this repo mid-PA1.**

### Expo SDK 55 vs 54?

Stay on 55. No downgrade needed.

---

## 3. Feature Inventory (What Actually Exists)

### Backend routes (built)

| Area | Highlights |
|---|---|
| Auth | JWT login, role in token |
| Contacts | Directory with department filters |
| Schedule | Role-aware: students by dept/year; lecturers by `lecturerId`; admin CRUD |
| Notices | Targeting (`EVERYONE`, `DEPARTMENT`, `YEAR_GROUP`, `ROLE_ONLY`), attachments, **SSE broadcast on create** |
| Bookings | FCFS with **atomic transaction**, admin approve/reject + push |
| Lecturer leave | PENDING → APPROVED/REJECTED, college-wide board, push on status change |
| Upload | Local `./uploads/` or Cloudinary |
| Users | `POST /users/push-token` only — **no** `GET/PATCH /users/me` yet (Phase 4) |

### Mobile screens (built)

| Screen | Notes |
|---|---|
| `NoticeBoardScreen` | Target badges, attachments, pull-to-refresh, **SSE prepend on new notice** |
| `ScheduleScreen` | Student timetable vs lecturer teaching view |
| `MyLeaveScreen` | Status badges + lecturer leave board |
| `BookingScreen` / `MybookingsScreen` | Facility booking flow |
| Push | `expo-notifications` + token registered on login via `AuthContext` |

### Admin pages (built)

`DashboardPage` · `BookingsPage` · `SchedulePage` · `NoticesPage` (target + file upload) · `LeavePage` · `FacilitiesPage`

### Schema-only (Phase 5 — no routes yet)

- `Attendance` — unique per student + schedule + date
- `LostFound` — LOST/FOUND, OPEN → CLAIMED → RESOLVED

---

## 4. Estimated Grading (SWE201 PA1)

| Category | Marks | Est. | Notes |
|---|---|---|---|
| Requirement coverage | 20 | 19 | Assigned phases (1–3) complete |
| Technical implementation | 25 | 23 | Auth, Prisma, targeting, push, SSE, booking transaction |
| Architecture & design | 20 | 18 | Clean three-part split; routes still fat (no service layer) |
| UI/UX | 15 | 12 | Consistent theme; home stats partly placeholder |
| Documentation | 10 | 8 | Strong handoff docs; root README still thin |
| Code quality | 10 | 7 | No automated tests; JavaScript |

**Total: ~87/100 — Distinction**

Phases 4–5 were deferred by instructor and do not reduce the PA1 grade if 1–3 are solid.

**To reach 90+:** basic tests (auth, `deriveCurrentYear`, booking conflict), optional `expo-secure-store` for JWT.

---

## 5. Known Gaps & Technical Debt

Legend: ✅ fixed in codebase · 🔲 open

### Security

| Issue | Status |
|---|---|
| JWT in AsyncStorage (plain text) | 🔲 Use `expo-secure-store` in `AuthContext.js` |
| No rate limiting on `/auth/login` | 🔲 `hono-rate-limiter` on auth routes |
| Weak/default `JWT_SECRET` in `.env` | 🔲 Rotate for production |
| No request body size limit | 🔲 Middleware in `index.js` |
| CORS only localhost origins | 🔲 Add Railway + Vercel URLs after deploy |
| Passwords in seed/CSV imports | 🔲 Document as dev-only; force change in prod |

Prisma parameterizes queries — SQL injection risk is low; validate/sanitize with Zod (already on most POST bodies).

### Architecture

| Issue | Status |
|---|---|
| Logic in route handlers (no service layer) | 🔲 Acceptable for PA1; note in system design doc |
| Single Node process | 🔲 Fine until ~700 users; Railway scales vertically first |

### API / mobile UX

| Issue | Status |
|---|---|
| No API versioning (`/api/v1/`) | 🔲 |
| No pagination on contacts/notices | 🔲 |
| No offline mode / retry / skeletons | 🔲 |
| Notice board SSE without `import EventSource from 'react-native-sse'` | 🔲 Verify on device; add explicit import if stream fails |

### Real time & concurrency

| Issue | Status |
|---|---|
| Notice board manual refresh only | ✅ **SSE** — `GET /notices/live` + mobile listener |
| Booking double-book race | ✅ **`prisma.$transaction`** in `bookings.js` |

### Testing & DevOps

| Issue | Status |
|---|---|
| Zero automated tests | 🔲 |
| No CI/CD, Docker, structured logging | 🔲 |
| **Phase 0 deployment** (Neon + Railway + `API_BASE`) | 🔲 **Critical for APK testers** |

---

## 6. Quick Wins Before Submission / Demo

Prioritized by impact vs effort:

1. **Phase 0 deploy** — follow `futureprogress.md` § Phase 0 (Neon → Railway → update `API_BASE` → EAS preview APK).
2. **SecureStore for token** — replace AsyncStorage token read/write in `AuthContext.js` + `api/client.js`.
3. **Explicit SSE import** in `NoticeBoardScreen.js`:
   ```js
   import EventSource from 'react-native-sse';
   ```
4. **Production CORS** — add Railway URL to `index.js` cors `origin` array.
5. **Rate limit** — `hono-rate-limiter` on `/auth/*` (100 req / 15 min).
6. **README** at repo root — problem, stack, how to run three parts, test accounts (from `progress1.1.md` §10).

Optional: pagination on `GET /notices` and `GET /contacts` (`take` / `skip` query params).

---

## 7. SSE — Implemented Design

Chosen over WebSockets: one-way admin → client updates, works over HTTP, no extra server.

### Backend

| File | Role |
|---|---|
| `src/sse.js` | `addSubscriber`, `removeSubscriber`, `broadcastNewNotice` |
| `src/routes/notices.js` | `broadcastNewNotice(full)` after `POST /notices`; `GET /live` stream |

Flow on new notice:

```
Admin POST /notices → Prisma create → push (notifyNewNotice) → SSE broadcast → all connected apps prepend notice
```

### Mobile

`NoticeBoardScreen.js` connects to `${API_BASE}/notices/live` with `Authorization: Bearer <token>`, ignores `{ type: "connected" }`, reconnects after 5s on error.

### Unchanged by SSE

Existing REST routes, auth, booking, schedule, admin dashboard CRUD.

---

## 8. Push Notifications — Implemented

| Trigger | Where |
|---|---|
| New notice (targeted audience) | `notices.js` → `notifyNewNotice` |
| Leave approved/rejected | `lecturer.js` → `notifyLeaveStatus` |
| Lecturer on leave (students in dept) | `lecturer.js` → `notifyStudentsLecturerOnLeave` |
| Booking approved/rejected | `bookings.js` → `notifyBookingStatus` |

Mobile: `registerPushToken.js` + `AuthContext` effect on `token`. Requires **physical device + EAS build** (not reliable in Expo Go alone). Works end-to-end after Phase 0.

---

## 9. Deployment Plan

| Item | Tool | Cost |
|---|---|---|
| Backend + process | Railway Starter | ~$5–10/mo |
| PostgreSQL | Neon (free tier) or Railway add-on | $0–5/mo |
| Admin dashboard | Vercel | Free |
| Play Store (optional) | Google Play Console | $25 one-time |

**Do not start with AWS** for this project — Railway + Neon + Vercel is enough for ~700 users.

### Order of operations

1. Neon: `DATABASE_URL` → `npx prisma migrate deploy` → re-seed/import CSVs  
2. Railway: env vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`)  
3. `CampusCompanion/src/api/client.js`: set production `API_BASE` to Railway URL  
4. `eas build --platform android --profile preview` (internal APK)  
5. Vercel: point admin `api/client.js` at same Railway URL  

### Demo narrative for CST

- Live: admin approves booking → student push + dashboard update  
- Post notice → phone on Notice tab updates without pull-to-refresh (SSE)  
- Frame as replacement for scattered WhatsApp / email notices  

---

## 10. Scale (~700 Users)

Realistic spikes: morning timetable (~100–150 concurrent), new notice (~200–300). Railway paid tier + 5-minute in-memory cache on `GET /schedule` (optional) is sufficient before horizontal scaling.

Bottlenecks today: no rate limiting, no schedule cache, single Node instance — acceptable for PA1; document as Phase 3+ ops debt.

---

## 11. What to Build Next

Use **`futureprogress.md`** for full API specs. Summary:

### Phase 4 — User management

- `GET/PATCH /users/me` + `ProfileScreen.js`  
- Admin `LecturersPage.jsx` / `StudentsPage.jsx` + `POST /admin/year-progression`  
- `HomeScreen.js` alert strip (dept leave count, pending leave, etc.)

### Phase 5 — Advanced

- `src/routes/attendance.js` + `AttendanceScreen.js` + `AttendancePage.jsx`  
- `src/routes/lostfound.js` + `LostFoundScreen.js` + `LostFoundPage.jsx`

### Suggested chat prompts

Copy with `progress1.1.md` + `futureprogress.md`:

- *"Set up Phase 0: Neon database, Railway backend, update API_BASE, EAS preview APK."*  
- *"Build Phase 4 profile screen and /users/me routes."*  
- *"Build Phase 5 attendance system per futureprogress.md."*

---

## 12. Learning Roadmap (Personal)

| When | Focus |
|---|---|
| **This semester (submit PA1)** | Phase 0 deploy, demo video, root README, optional SecureStore + rate limit |
| **Next semester** | Phase 4–5 features, Play Store internal track |
| **Next greenfield project** | TypeScript, NestJS or stricter Hono structure, `/api/v1/`, tests from day one |
| **3rd–4th year** | Go basics, Docker, CI/CD, observability |

### Technology primer (short)

- **Tests:** Jest unit tests for `deriveCurrentYear()`; Supertest for `POST /auth/login`; Detox for mobile E2E later.  
- **Go:** Backend language for high concurrency — learn after TypeScript depth.  
- **NestJS:** Opinionated Node framework with DI — good next step after this Hono API.

---

## 13. System Design Documentation Checklist

Use this in your architecture write-up:

**Diagram**

```
┌─────────────────┐     ┌──────────────────┐
│ Expo Mobile App │     │ Admin (Vite/React)│
└────────┬────────┘     └────────┬─────────┘
         │    HTTPS REST + SSE    │
         └──────────┬─────────────┘
                    ▼
         ┌──────────────────────┐
         │  Hono API (Node.js)   │
         │  · JWT auth           │
         │  · Prisma → Postgres  │
         │  · SSE /notices/live  │
         │  · Expo Push API      │
         └──────────────────────┘
```

**Strengths to highlight**

- Role-aware schedule and notice targeting  
- Leave and booking workflows with admin approval  
- Real-time notices (SSE) + mobile push  
- Atomic booking creation  

**Known limitations (honest framing)**

> Rate limiting, API versioning, and automated tests are identified technical debt. Phase 0 cloud deployment is required for production APK testing. Attendance and lost-and-found models exist in schema; routes are planned for Phase 5.

**Scalability paragraph**

700 users, 8am timetable spike, optional 5-minute schedule cache, Railway vertical scale first.

---

## 14. Resume Line (After Deploy)

> Designed and deployed a full-stack campus management system for College of Science and Technology, RUB — React Native (Expo), Node.js (Hono), PostgreSQL, real-time notices (SSE), and role-based workflows for 700+ students and staff.

---

## 15. Test Credentials

From `progress1.1.md`:

| Role | Login | Password |
|---|---|---|
| Admin | admin@cst.edu.bt | admin123 |
| Student | student@cst.edu.bt | student123 |
| Lecturer | lecturer@cst.edu.bt | lecturer123 |

Imported users: email or student/employee ID as password.

---

## 16. Local Development (Quick Start)

```bash
# Terminal 1 — backend
cd campus-companion-backend
npm install
npx prisma migrate deploy   # or dev migrate
node prisma/seed.js
npm run dev                   # port 3000, 0.0.0.0

# Terminal 2 — admin
cd campus-companion-admin
npm install
npm run dev                   # usually :5173

# Terminal 3 — mobile
cd CampusCompanion
npm install
npx expo start                # same Wi-Fi; API_BASE auto-detects LAN IP
```

Ensure phone and PC share Wi-Fi, or set `MANUAL_API_BASE` in `CampusCompanion/src/api/client.js`.

---

*Last aligned with codebase: June 2026 — Campus Companion v4.0*  
*Phases 1–3 complete · Phase 0 deployment pending · Phases 4–5 spec in `futureprogress.md`*
