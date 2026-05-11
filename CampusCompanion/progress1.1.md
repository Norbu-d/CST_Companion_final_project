# Campus Companion — Full Project Progress & Handoff

> Use this file to resume work in a new Claude chat. Paste the entire contents and say:
> **"Continue building my Campus Companion project. Here is the full context:"**

---

## 1. Project Overview & Goal

**Project Name:** Campus Companion — Full Stack System (Mobile App + Backend API + Admin Dashboard)
**Purpose:** A complete digital companion platform for students and administrators at CST (College of Science and Technology), Rinchending, Phuentsholing, Royal University of Bhutan.
**Assignment:** SWE201 – Cross Platform Development | Programming Assignment 1 | Year 3, Semester 2

### The system is made up of three interconnected parts:

**1. Campus Companion Mobile App (Expo / React Native)**
The student-facing app. Students can log in, view contacts, check their class schedule, read notices, browse facilities, and book facilities like the football ground or computer labs. After booking, they can track the status of their requests.

**2. Campus Companion Backend (Node.js / Hono REST API)**
The central server that both the mobile app and admin dashboard talk to. It handles all authentication via JWT, stores and serves real data from a PostgreSQL database, enforces booking slot conflict checks, and exposes admin-only endpoints for managing the system. The mobile app ↔ backend connection is fully complete.

**3. Campus Companion Admin Dashboard (Vite + React — TO BE BUILT)**
A web-based internal tool for administrators at CST. Admins can log in and manage the entire system: approve or reject student booking requests, publish notices and send push notifications to students, create and edit the weekly class timetable, and temporarily block facility availability for maintenance or events.

### How the three parts connect:
- The **mobile app** calls the backend API to fetch data and submit actions (login, view schedule, book facility, etc.)
- The **admin dashboard** calls the same backend API using admin-only endpoints to manage bookings, notices, schedule, and facilities
- The **backend** is the single source of truth — it reads/writes to PostgreSQL and serves both clients

---

## 2. Tech Stack

### Mobile App (Expo)
| Tool / Library | Purpose |
|---|---|
| Expo / React Native | Cross-platform mobile framework |
| React Navigation | Screen routing and navigation |
| AsyncStorage | Storing JWT token locally on device |
| fetch / axios | HTTP calls to the backend API |
| expo-notifications | (Planned) Push notification support |

### Backend API (Node.js)
| Tool / Library | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Hono | ^4.x | Web framework — fast, modern, Web Standards API |
| @hono/node-server | ^1.x | Adapter to run Hono on Node.js |
| Prisma | ^5.x | ORM — schema, migrations, type-safe queries |
| PostgreSQL | 15+ | Relational database |
| jsonwebtoken | ^9.x | JWT creation and verification |
| bcryptjs | ^2.x | Password hashing |
| zod | ^3.x | Request body validation |
| dotenv | ^16.x | Environment variable loading |
| nodemon | ^3.x (dev) | Auto-restart during development |

**Why Hono over Express:** Significantly faster (Web Standards API, no legacy baggage), built-in `cors` and `logger` middleware, first-class JS/TS support, smaller bundle size, and clean readable route definitions.

### Admin Dashboard (Vite + React — chosen over Next.js)
| Tool / Library | Purpose |
|---|---|
| Vite | Build tool and dev server — fast, zero config |
| React | UI framework |
| React Router v6 | Client-side routing |
| Axios | HTTP calls to backend API |
| TanStack Query | Server state management, caching, refetching |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Pre-built accessible UI components |

**Why Vite over Next.js:** The admin dashboard is a pure internal SPA — it needs no SEO, no SSR, and no server-side rendering. Next.js adds complexity that isn't needed here. Vite is simpler, faster to start, and easy to deploy as static files.

---

## 3. Complete File Structure

### Backend (`campus-companion-backend/`)
```
campus-companion-backend/
├── prisma/
│   ├── schema.prisma              ← All DB models (User, Contact, Schedule, Notice, Facility, Booking)
│   └── seed.js                    ← Seeds DB with sample contacts, schedule, notices, facilities, users
├── src/
│   ├── index.js                   ← Entry point: Hono app, all middleware, all routes mounted
│   ├── db.js                      ← Prisma client singleton
│   ├── middleware/
│   │   ├── auth.js                ← JWT auth middleware + adminMiddleware
│   │   └── errorHandler.js        ← Global Zod + general error handler
│   ├── routes/
│   │   ├── auth.js                ← POST /auth/register, POST /auth/login
│   │   ├── contacts.js            ← GET /contacts, GET /contacts/:id (with ?search=)
│   │   ├── schedule.js            ← GET /schedule (with ?day= filter)
│   │   ├── notices.js             ← GET /notices (with ?category= filter)
│   │   ├── facilities.js          ← GET /facilities, GET /facilities/:key
│   │   └── bookings.js            ← GET /bookings/my, GET /bookings/slots, POST /bookings,
│   │                                 PATCH /bookings/:id/status (admin), GET /bookings/all (admin)
│   └── validators/
│       ├── auth.validator.js      ← Zod schemas: registerSchema, loginSchema
│       └── booking.validator.js   ← Zod schema: bookingSchema
├── .env
├── .env.example
├── .gitignore
└── package.json
```

### Admin Dashboard (`campus-companion-admin/` — to be scaffolded)
```
campus-companion-admin/
├── src/
│   ├── main.jsx                   ← App entry point
│   ├── App.jsx                    ← Router setup, protected routes
│   ├── api/
│   │   └── client.js              ← Axios instance with JWT interceptor
│   ├── pages/
│   │   ├── LoginPage.jsx          ← Admin login form
│   │   ├── BookingsPage.jsx       ← View all bookings, approve/reject
│   │   ├── NoticesPage.jsx        ← Create/edit/delete notices
│   │   ├── SchedulePage.jsx       ← Weekly timetable grid, add/edit slots
│   │   └── FacilitiesPage.jsx     ← Manage facilities, set blackout periods
│   ├── components/
│   │   ├── Layout.jsx             ← Sidebar navigation, header
│   │   ├── ProtectedRoute.jsx     ← Redirects to login if not authenticated
│   │   └── ...
│   └── hooks/
│       └── useAuth.js             ← Auth state management
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## 4. Database Schema (Prisma)

| Model | Key Fields |
|---|---|
| `User` | id, studentId (unique), name, email (unique), password (hashed), role (STUDENT/ADMIN) |
| `Contact` | id, name, role, phone, email, department, officeHours |
| `Schedule` | id, day, time, subject, room, type (Lab/Lecture/Tutorial/Workshop) |
| `Notice` | id, title, body, category, pinned, icon, date |
| `Facility` | id, facilityKey (unique), name, description, capacity, location, color, icon, rules (String[]) |
| `Booking` | id, userId (→ User), facilityId (→ Facility), date, slots (Int[]), purpose, status (PENDING/APPROVED/REJECTED), createdAt |

Enums: `Role` (STUDENT, ADMIN), `BookingStatus` (PENDING, APPROVED, REJECTED)

---

## 5. What Is Remaining / Next Steps

### ✅ Completed
- [x] Full backend API with all routes (auth, contacts, schedule, notices, facilities, bookings)
- [x] JWT authentication and admin middleware
- [x] Slot conflict checking on bookings
- [x] Database schema and seed data
- [x] All Expo mobile screens connected to real backend API
- [x] JWT token stored in AsyncStorage on mobile
- [x] LoginScreen built in Expo

### 🔲 Admin Dashboard (Vite + React) — Main Priority
- [ ] Scaffold Vite + React project: `campus-companion-admin/`
- [ ] Set up Tailwind CSS + shadcn/ui
- [ ] Build `LoginPage.jsx` — POST `/auth/login` with admin credentials, store JWT
- [ ] Build `ProtectedRoute.jsx` — redirect to login if no token
- [ ] Build `Layout.jsx` — sidebar with nav links to all pages
- [ ] Build `BookingsPage.jsx` — table of all bookings, approve/reject buttons (PATCH `/bookings/:id/status`)
- [ ] Build `NoticesPage.jsx` — list notices, form to create/edit/delete
- [ ] Build `SchedulePage.jsx` — weekly timetable grid, add/edit/delete class slots
- [ ] Build `FacilitiesPage.jsx` — list facilities, set temporary unavailability (blackout periods)

### 🔲 Backend Additions Needed for Admin Dashboard
- [ ] Add `POST /notices`, `PATCH /notices/:id`, `DELETE /notices/:id` (admin only)
- [ ] Add `POST /contacts`, `PATCH /contacts/:id`, `DELETE /contacts/:id` (admin only)
- [ ] Add `POST /schedule`, `PATCH /schedule/:id`, `DELETE /schedule/:id` (admin only)
- [ ] Add facility blackout model to Prisma schema: `FacilityBlackout` (facilityId, startDate, endDate, reason)
- [ ] Add `POST /facilities/:key/blackout`, `DELETE /facilities/:key/blackout/:id` (admin only)
- [ ] Update `GET /bookings/slots` to also block slots that fall within a blackout period

### 🔲 Notifications
- [ ] Add `expo-notifications` to Expo app for push notification support
- [ ] Store Expo push tokens in the User table on backend
- [ ] When admin approves/rejects a booking, send push notification to the student
- [ ] When admin publishes a notice, send push notification to all students

### 🔲 Backend Enhancements
- [ ] Add refresh token mechanism (currently tokens expire after 7 days)
- [ ] Add rate limiting middleware (`hono/throttle`)
- [ ] Deploy backend to Railway or Render (both have free PostgreSQL tiers)

---

## 6. How to Continue in a New Claude Chat

Copy and paste this entire `progress.md` file into a new Claude chat and say:

> **"Continue building my Campus Companion project. Here is the full context."**

Then ask for what you need, for example:

- *"Scaffold the Vite + React admin dashboard with Tailwind and shadcn/ui"*
- *"Build the LoginPage and ProtectedRoute for the admin dashboard"*
- *"Build the BookingsPage for the admin dashboard with approve/reject"*
- *"Add the CRUD endpoints for notices and schedule to the backend"*
- *"Add the facility blackout feature to the backend and Prisma schema"*
- *"Set up push notifications when a booking is approved or rejected"*
- *"Help me deploy the backend to Railway with a free PostgreSQL database"*

Claude will have full context of every route, the database schema, all middleware, all design decisions, and the current state of all three parts of the system.

---

## 7. API Response Format (Consistent)

All endpoints return:
```json
{ "success": true, "data": { ... } }
```
or on error:
```json
{ "success": false, "message": "..." }
```
Zod validation errors return:
```json
{ "success": false, "message": "Validation error", "errors": [ ... ] }
```

---

## 8. Backend API Reference

### Auth Routes (no authentication required)
| Method | Route | Description |
|---|---|---|
| POST | `/auth/register` | Register new student, returns JWT |
| POST | `/auth/login` | Login, returns JWT + user object |

### Student Routes (JWT required)
| Method | Route | Description |
|---|---|---|
| GET | `/contacts` | All contacts, supports `?search=` |
| GET | `/contacts/:id` | Single contact |
| GET | `/schedule` | All schedule entries, supports `?day=Monday` |
| GET | `/notices` | All notices, supports `?category=Exam` |
| GET | `/facilities` | All facilities |
| GET | `/facilities/:key` | Single facility by key (e.g. `football`) |
| GET | `/bookings/my` | Current student's bookings |
| GET | `/bookings/slots?facilityId=&date=` | Already-booked slots for a facility+date |
| POST | `/bookings` | Create a booking (checks slot conflicts) |

### Admin Routes (JWT + Admin role required)
| Method | Route | Description |
|---|---|---|
| GET | `/bookings/all` | All bookings with user + facility info |
| PATCH | `/bookings/:id/status` | Approve or reject a booking |

---

## 9. Installation & Running

### Backend
```bash
cd campus-companion-backend
npm install
cp .env.example .env          # Set DATABASE_URL to your PostgreSQL connection string
npx prisma migrate dev --name init
npx prisma db seed
npm run dev                    # Runs at http://localhost:3000
```

### Mobile App
```bash
cd campus-companion              # Your Expo project folder
npm install
npx expo start
```
> On Android emulator use `http://10.0.2.2:3000` to reach backend. On iOS simulator use `http://localhost:3000`.

### Admin Dashboard (once scaffolded)
```bash
cd campus-companion-admin
npm install
npm run dev                    # Runs at http://localhost:5173
```

---

## 10. Test Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@cst.edu.bt | admin123 |
| Student | student@cst.edu.bt | student123 |

---

## 11. Known Issues & Limitations

1. No HTTPS locally — fine for development; add TLS on deployment
2. No email notifications — booking status changes don't email students yet
3. Schedule is college-wide, not per-student — all students see the same timetable
4. No file uploads — notice attachments or user avatars not supported yet
5. JWT has no refresh token — user must re-login after 7 days
6. Facility blackout feature not yet built — admins cannot currently block facilities from being booked

---

*Last updated: April 2026 | CST, RUB — SWE201 Programming Assignment 1 | System v1.1 (Backend + Mobile complete, Admin Dashboard in progress)*