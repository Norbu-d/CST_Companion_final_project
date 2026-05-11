# Campus Companion — Backend Progress & Handoff

> Use this file to resume work in a new Claude chat. Paste the entire contents and say:
> **"Continue building my Campus Companion backend. Here is the full context:"**

---

## 1. Project Overview & Goal

**Project Name:** Campus Companion — REST API Backend
**Purpose:** Serves the Campus Companion Expo mobile app and the Next.js admin dashboard for CST (College of Science and Technology), Rinchending, Phuentsholing, Royal University of Bhutan.
**Assignment:** SWE201 – Cross Platform Development | Programming Assignment 1 | Year 3, Semester 2
**Repo:** `campus-companion-backend/`

**What this backend does:**
- Authenticates students and admins via JWT
- Serves contacts, schedule, notices, and facilities data from a real PostgreSQL database
- Handles facility booking requests with slot conflict checking
- Exposes admin-only endpoints for approving/rejecting bookings
- Replaces all hardcoded static data in the Expo frontend

---

## 2. Tech Stack

| Tool / Library | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Hono | ^4.x | Web framework (chosen over Express for speed + modern API) |
| @hono/node-server | ^1.x | Adapter to run Hono on Node.js |
| Prisma | ^5.x | ORM — schema, migrations, type-safe queries |
| PostgreSQL | 15+ | Relational database |
| jsonwebtoken | ^9.x | JWT creation and verification |
| bcryptjs | ^2.x | Password hashing |
| zod | ^3.x | Request body validation |
| dotenv | ^16.x | Environment variable loading |
| nodemon | ^3.x (dev) | Auto-restart during development |

**Why Hono over Express:**
- Significantly faster (Web Standards API, no legacy baggage)
- Built-in middleware: `cors`, `logger` — no extra packages
- First-class JS/TS support
- Clean, readable route definitions
- Smaller bundle size

---

## 3. Complete File Structure

```
campus-companion-backend/
├── prisma/
│   ├── schema.prisma              ← All DB models (User, Contact, Schedule, Notice, Facility, Booking)
│   └── seed.js                    ← Seeds DB with sample contacts, schedule, notices, facilities, users
├── src/
│   ├── index.js                   ← Entry point: Hono app, all middleware, all routes mounted
│   ├── db.js                      ← Prisma client singleton (shared across all routes)
│   ├── middleware/
│   │   ├── auth.js                ← JWT auth middleware + adminMiddleware
│   │   └── errorHandler.js        ← Global Zod + general error handler
│   ├── routes/
│   │   ├── auth.js                ← POST /auth/register, POST /auth/login
│   │   ├── contacts.js            ← GET /contacts, GET /contacts/:id (with search query)
│   │   ├── schedule.js            ← GET /schedule (with ?day= filter)
│   │   ├── notices.js             ← GET /notices (with ?category= filter)
│   │   ├── facilities.js          ← GET /facilities, GET /facilities/:key
│   │   └── bookings.js            ← GET /bookings/my, GET /bookings/slots, POST /bookings,
│   │                                 PATCH /bookings/:id/status (admin), GET /bookings/all (admin)
│   └── validators/
│       ├── auth.validator.js      ← Zod schemas: registerSchema, loginSchema
│       └── booking.validator.js   ← Zod schema: bookingSchema
├── .env                           ← Local secrets (not committed)
├── .env.example                   ← Template with placeholder values
├── .gitignore
└── package.json
```

---

## 4. What Each File Does

### `src/index.js`
Root entry point. Creates the Hono app, attaches global `cors()` and `logger()` middleware, mounts all route files under their prefixes (`/auth`, `/contacts`, `/schedule`, `/notices`, `/facilities`, `/bookings`), registers the `onError` handler and a `notFound` handler, then starts the server on `PORT` from `.env`.

---

### `src/db.js`
Exports a single `PrismaClient` instance. Importing this file anywhere in the project gives you the same Prisma instance — avoids multiple DB connections.

---

### `prisma/schema.prisma`
Defines 6 models:

| Model | Fields |
|---|---|
| `User` | id, studentId (unique), name, email (unique), password (hashed), role (STUDENT/ADMIN) |
| `Contact` | id, name, role, phone, email, department, officeHours |
| `Schedule` | id, day, time, subject, room, type (Lab/Lecture/Tutorial/Workshop) |
| `Notice` | id, title, body, category, pinned, icon, date |
| `Facility` | id, facilityKey (unique), name, description, capacity, location, color, icon, rules (String[]) |
| `Booking` | id, userId (→ User), facilityId (→ Facility), date, slots (Int[]), purpose, status (PENDING/APPROVED/REJECTED), createdAt |

Enums: `Role` (STUDENT, ADMIN), `BookingStatus` (PENDING, APPROVED, REJECTED)

---

### `prisma/seed.js`
Seeds the database with:
- 1 admin user: `admin@cst.edu.bt` / `admin123`
- 1 student user: `student@cst.edu.bt` / `student123`
- 5 contacts (CST staff with realistic Bhutanese names)
- 7 schedule entries across Mon–Fri
- 3 notices (one pinned)
- 5 facilities (Football Ground, Conventional Hall, Lab 1, Lab 2, Lab 3)

Uses `upsert` / `createMany` with `skipDuplicates: true` so re-running never duplicates data.

---

### `src/middleware/auth.js`
Two middleware functions:
- `authMiddleware` — extracts `Bearer <token>` from `Authorization` header, verifies with `JWT_SECRET`, stores decoded payload in `c.set('user', decoded)` for downstream routes
- `adminMiddleware` — reads `c.get('user')`, rejects with 403 if role is not ADMIN. Applied on top of `authMiddleware`.

---

### `src/middleware/errorHandler.js`
Hono `onError` handler. Detects `ZodError` (returns 400 with field-level errors) or falls back to a generic 500 response.

---

### `src/validators/auth.validator.js`
- `registerSchema` — validates studentId, name, email, password (min 6 chars)
- `loginSchema` — validates email + password

---

### `src/validators/booking.validator.js`
- `bookingSchema` — validates facilityId (number), date (YYYY-MM-DD regex), slots (array of 0–8 integers, min 1), purpose (10–200 chars)

---

### `src/routes/auth.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Creates new student account, returns JWT |
| POST | `/auth/login` | None | Validates credentials, returns JWT + user object (no password) |

---

### `src/routes/contacts.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/contacts` | JWT | Returns all contacts. Accepts `?search=` query to filter by name/role/department (case-insensitive) |
| GET | `/contacts/:id` | JWT | Returns single contact by ID |

---

### `src/routes/schedule.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/schedule` | JWT | Returns all schedule entries. Accepts `?day=Monday` etc. |

---

### `src/routes/notices.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/notices` | JWT | Returns notices sorted by pinned→date desc. Accepts `?category=Exam` etc. |

---

### `src/routes/facilities.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/facilities` | JWT | Returns all facilities |
| GET | `/facilities/:key` | JWT | Returns single facility by `facilityKey` string (e.g. `football`) |

---

### `src/routes/bookings.js`
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/bookings/my` | JWT (student) | Returns all bookings for the logged-in student, includes facility info |
| GET | `/bookings/slots?facilityId=&date=` | JWT | Returns array of already-booked slot indices for a facility+date (for frontend to grey out) |
| POST | `/bookings` | JWT (student) | Creates a booking after checking for slot conflicts |
| PATCH | `/bookings/:id/status` | JWT + Admin | Updates booking status to APPROVED or REJECTED |
| GET | `/bookings/all` | JWT + Admin | Returns all bookings with user + facility info (for admin dashboard) |

---

## 5. API Response Format (Consistent)

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

## 6. Installation & Running

### Prerequisites
- Node.js 20 LTS
- PostgreSQL 15+ running locally (or use Supabase free tier)

```bash
# 1. Clone and install
git clone https://github.com/<your-username>/campus-companion-backend.git
cd campus-companion-backend
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env — set DATABASE_URL to your PostgreSQL connection string

# 3. Run database migration (creates all tables)
npx prisma migrate dev --name init

# 4. Seed the database
npx prisma db seed

# 5. Start dev server (auto-restarts on file change)
npm run dev

# Server runs at: http://localhost:3000

# Optional: Visual database browser
npm run db:studio
```

### Available npm scripts
| Script | Command | Purpose |
|---|---|---|
| `npm run dev` | nodemon src/index.js | Dev server with auto-restart |
| `npm start` | node src/index.js | Production start |
| `npm run db:migrate` | prisma migrate dev | Run new migrations |
| `npm run db:seed` | prisma db seed | Seed sample data |
| `npm run db:studio` | prisma studio | Visual DB browser at localhost:5555 |
| `npm run db:reset` | prisma migrate reset | Wipe + re-migrate + re-seed |

---

## 7. Connecting the Expo Frontend to This Backend

Replace the hardcoded data in each screen with API calls. Example for `ContactsScreen.js`:

```js
// Add to ContactsScreen.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:3000'; // Android emulator
// const API_BASE = 'http://localhost:3000'; // iOS simulator

const fetchContacts = async (search = '') => {
  const token = await AsyncStorage.getItem('token');
  const res = await fetch(`${API_BASE}/contacts?search=${search}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  return json.data;
};
```

> Note: On Android emulator, use `10.0.2.2` to reach your machine's localhost. On iOS simulator, use `localhost`.

---

## 8. What Is Remaining / Next Steps

### Mobile App Integration
- [ ] Add `axios` or use `fetch` in each Expo screen to replace hardcoded data
- [ ] Add `AsyncStorage` to store JWT token after login
- [ ] Build a `LoginScreen.js` in Expo (POST `/auth/login`)
- [ ] Add a token-aware API client utility (`src/api/client.js` in Expo project)
- [ ] Replace static contacts in `ContactsScreen.js` with `GET /contacts`
- [ ] Replace static schedule in `ScheduleScreen.js` with `GET /schedule`
- [ ] Replace static notices in `NoticeBoardScreen.js` with `GET /notices`
- [ ] Replace static facilities in `BookingScreen.js` with `GET /facilities`
- [ ] Replace simulated booked slots in `BookingScreen.js` with `GET /bookings/slots`
- [ ] Replace submit booking stub with `POST /bookings`
- [ ] Add a **My Bookings** screen using `GET /bookings/my`

### Admin Dashboard (Next.js)
- [ ] Scaffold Next.js project: `campus-companion-admin/`
- [ ] Build login page (POST `/auth/login` with admin credentials)
- [ ] Build bookings management page (GET `/bookings/all`, PATCH `/bookings/:id/status`)
- [ ] Build notices management page (future: POST/PATCH/DELETE `/notices`)
- [ ] Build contacts management page (future CRUD on `/contacts`)

### Backend Enhancements
- [ ] Add `POST /notices`, `PATCH /notices/:id`, `DELETE /notices/:id` (admin only) so admin dashboard can manage notices
- [ ] Add `POST /contacts`, `PATCH /contacts/:id`, `DELETE /contacts/:id` (admin only)
- [ ] Add `POST /schedule`, `PATCH /schedule/:id` (admin only)
- [ ] Add refresh token mechanism (currently tokens expire after 7 days)
- [ ] Add rate limiting middleware (`hono/throttle`)
- [ ] Deploy to Railway, Render, or Fly.io (all have free PostgreSQL tiers)
- [ ] Add `expo-notifications` push support (send notification when booking is approved/rejected)

---

## 9. Known Issues & Limitations

1. **No HTTPS locally** — fine for development; add TLS when deploying to production
2. **No email notifications** — booking status updates don't yet notify students by email
3. **Schedule is per-college, not per-student** — all students see the same schedule (future: filter by student programme/year)
4. **No file uploads** — notice attachments / avatars not supported yet
5. **PostgreSQL must be running locally** — consider Supabase or Railway for easy cloud hosting
6. **JWT has no refresh token** — user must log in again after 7 days

---

## 10. How to Continue in a New Claude Chat

Copy and paste this entire `progress-backend.md` file into a new Claude chat and say:

> **"Continue building my Campus Companion backend. Here is the full context."**

Then ask for what you need, for example:
- *"Connect the Expo ContactsScreen to the real backend API"*
- *"Build the Next.js admin dashboard to manage bookings"*
- *"Add CRUD endpoints for notices and contacts (admin only)"*
- *"Help me deploy this backend to Railway with a free PostgreSQL database"*
- *"Add a LoginScreen to my Expo app and handle JWT storage"*

Claude will have full context of every route, the database schema, all middleware, and all design decisions.

---

## 11. Test Credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@cst.edu.bt | admin123 |
| Student | student@cst.edu.bt | student123 |

---

*Last updated: April 2026 | CST, RUB — SWE201 Programming Assignment 1 | Backend v1.0*