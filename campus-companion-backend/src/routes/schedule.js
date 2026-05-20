const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derive the current academic year number for a student.
 *
 * Academic years in most institutions begin mid-year (e.g. August/September).
 * We treat the academic year as starting in August (month index 7).
 *
 * Examples (assuming August start):
 *   intakeYear 2023, current date Jan 2026  → academic year started Sep 2025 → year 3
 *   intakeYear 2023, current date Sep 2026  → academic year started Sep 2026 → year 4
 *
 * @param {number} intakeYear  - The calendar year the student enrolled (e.g. 2023)
 * @param {number} [academicStartMonth=7] - 0-based month index when academic year begins (7 = August)
 * @returns {number} Current academic year (1-based)
 */
function deriveCurrentYear(intakeYear, academicStartMonth = 7) {
  const now = new Date();
  // The academic year "label" is the calendar year in which it starts.
  // If we haven't yet passed the start month this calendar year, the current
  // academic year started in the PREVIOUS calendar year.
  const academicYearStart =
    now.getMonth() >= academicStartMonth
      ? now.getFullYear()
      : now.getFullYear() - 1;

  return academicYearStart - intakeYear + 1;
}

// ─── GET /schedule — Role-aware schedule ──────────────────────────────────────
// Students  → schedule for their department + computed current year
// Lecturers → their assigned classes only
// Admins    → all schedules
router.get('/', async (c) => {
  const user = c.get('user');

  if (user.role === 'STUDENT') {
    if (!user.department || !user.intakeYear) {
      return c.json({ success: true, data: [] });
    }

    // Use corrected academic year derivation
    const currentYear = deriveCurrentYear(user.intakeYear);

    // Repeating students stay in the year they are repeating
    const targetYear = user.isRepeating ? user.repeatYear ?? currentYear : currentYear;

    const schedule = await prisma.schedule.findMany({
      where: {
        department: user.department,
        year:       targetYear,
      },
      include: {
        lecturer: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ day: 'asc' }, { time: 'asc' }],
    });

    return c.json({ success: true, data: schedule });

  } else if (user.role === 'LECTURER') {
    const schedule = await prisma.schedule.findMany({
      where: { lecturerId: user.id },
      include: {
        lecturer: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ day: 'asc' }, { time: 'asc' }],
    });

    return c.json({ success: true, data: schedule });

  } else {
    // ADMIN: return all schedules
    const schedule = await prisma.schedule.findMany({
      include: {
        lecturer: {
          select: { id: true, name: true, email: true, department: true },
        },
      },
      orderBy: [
        { department: 'asc' },
        { year: 'asc' },
        { day: 'asc' },
        { time: 'asc' },
      ],
    });

    return c.json({ success: true, data: schedule });
  }
});

// ─── GET /schedule/department/:dept/year/:year ────────────────────────────────
// Admin only: full timetable for a specific department + year.
// Returns ALL semesters; semester filtering is done client-side so the UI
// can switch between semesters without extra round-trips.
router.get('/department/:dept/year/:year', adminMiddleware, async (c) => {
  const dept = c.req.param('dept');
  const year = parseInt(c.req.param('year'), 10);

  if (isNaN(year) || year < 1 || year > 4) {
    return c.json({ success: false, message: 'Invalid year parameter' }, 400);
  }

  const schedule = await prisma.schedule.findMany({
    where: { department: dept, year },
    include: {
      lecturer: {
        select: { id: true, name: true, email: true, department: true },
      },
    },
    orderBy: [{ semester: 'asc' }, { day: 'asc' }, { time: 'asc' }],
  });

  return c.json({ success: true, data: schedule });
});

// ─── POST /schedule ───────────────────────────────────────────────────────────
// Admin only: create a new schedule entry.
router.post('/', adminMiddleware, async (c) => {
  const body = await c.req.json();
  const {
    department, year, semester, academicYear,
    day, time, subject, room, type, lecturerId,
  } = body;

  const missing = ['department', 'year', 'semester', 'academicYear', 'day', 'time', 'subject', 'room', 'type']
    .filter(k => !body[k] && body[k] !== 0);

  if (missing.length > 0) {
    return c.json({
      success: false,
      message: `Missing required fields: ${missing.join(', ')}`,
    }, 400);
  }

  const schedule = await prisma.schedule.create({
    data: {
      department,
      year:        Number(year),
      semester:    Number(semester),
      academicYear,
      day,
      time,
      subject,
      room,
      type,
      // Explicit null when unassigned so Prisma clears any existing relation
      lecturerId: lecturerId != null ? parseInt(lecturerId, 10) : null,
    },
    include: {
      lecturer: { select: { id: true, name: true, email: true } },
    },
  });

  return c.json({ success: true, data: schedule }, 201);
});

// ─── PATCH /schedule/:id ──────────────────────────────────────────────────────
// Admin only: edit a schedule entry (including reassigning / clearing lecturer).
router.patch('/:id', adminMiddleware, async (c) => {
  const id      = parseInt(c.req.param('id'), 10);
  const updates = await c.req.json();

  if (isNaN(id)) {
    return c.json({ success: false, message: 'Invalid id parameter' }, 400);
  }

  // Coerce numeric fields if present to avoid type mismatches
  if (updates.year     !== undefined) updates.year     = Number(updates.year);
  if (updates.semester !== undefined) updates.semester = Number(updates.semester);
  if ('lecturerId' in updates) {
    updates.lecturerId = updates.lecturerId != null
      ? parseInt(updates.lecturerId, 10)
      : null;
  }

  const schedule = await prisma.schedule.update({
    where: { id },
    data:  updates,
    include: {
      lecturer: { select: { id: true, name: true, email: true } },
    },
  });

  return c.json({ success: true, data: schedule });
});

// ─── DELETE /schedule/:id ─────────────────────────────────────────────────────
// Admin only: delete a schedule entry.
router.delete('/:id', adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'), 10);

  if (isNaN(id)) {
    return c.json({ success: false, message: 'Invalid id parameter' }, 400);
  }

  try {
    await prisma.schedule.delete({ where: { id } });
    return c.json({ success: true, message: 'Schedule entry deleted' });
  } catch (err) {
    // Prisma throws P2025 when the record doesn't exist
    if (err.code === 'P2025') {
      return c.json({ success: false, message: 'Entry not found' }, 404);
    }
    // P2003 = foreign key constraint — shouldn't happen for Schedule but guard anyway
    if (err.code === 'P2003') {
      return c.json({
        success: false,
        message: 'Cannot delete: entry is referenced by other records',
      }, 409);
    }
    throw err; // re-throw for the global error handler
  }
});

module.exports = router;