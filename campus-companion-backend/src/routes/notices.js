const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { z } = require('zod');

const router = new Hono();

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Derive the current academic year (1–4) from the student's intake year.
 * intakeYear is stored as the calendar year they enrolled (e.g. 2022).
 * A new academic year starts each August.
 */
function deriveCurrentYear(intakeYear) {
  if (!intakeYear) return null;
  const now = new Date();
  const academicYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const year = academicYearStart - intakeYear + 1;
  return Math.min(Math.max(year, 1), 4); // clamp to 1–4
}

// ─── Validation ───────────────────────────────────────────────────────────────

const noticeSchema = z.object({
  title:            z.string().min(1),
  body:             z.string().min(1),
  category:         z.string().min(1),
  pinned:           z.boolean().optional().default(false),
  icon:             z.string().optional().default('megaphone'),
  // Targeting fields (all optional — default to EVERYONE)
  targetType:       z.enum(['EVERYONE', 'DEPARTMENT', 'YEAR_GROUP', 'ROLE_ONLY']).optional().default('EVERYONE'),
  targetDepartment: z.string().optional().nullable(),
  targetYear:       z.number().int().min(1).max(4).optional().nullable(),
  targetRole:       z.enum(['STUDENTS_ONLY', 'LECTURERS_ONLY']).optional().nullable(),
});

// ─── GET /notices ─────────────────────────────────────────────────────────────
// Authenticated — returns only notices relevant to the requesting user

router.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const category = c.req.query('category');

    // Build the targeting filter based on the requesting user's context
    const userYear = user.role === 'STUDENT' ? deriveCurrentYear(user.intakeYear) : null;

    const targetFilter = {
      OR: [
        // Always show notices targeted at everyone
        { targetType: 'EVERYONE' },

        // Department-level notices for the user's own department
        ...(user.department ? [{
          targetType:       'DEPARTMENT',
          targetDepartment: user.department,
        }] : []),

        // Year-group notices — students only (need both dept and year to match)
        ...(user.role === 'STUDENT' && user.department && userYear ? [{
          targetType:       'YEAR_GROUP',
          targetDepartment: user.department,
          targetYear:       userYear,
        }] : []),

        // Role-only notices
        ...(user.role === 'STUDENT' ? [{
          targetType: 'ROLE_ONLY',
          targetRole: 'STUDENTS_ONLY',
        }] : []),
        ...(user.role === 'LECTURER' ? [{
          targetType: 'ROLE_ONLY',
          targetRole: 'LECTURERS_ONLY',
        }] : []),

        // ADMIN sees everything
        ...(user.role === 'ADMIN' ? [
          { targetType: 'DEPARTMENT' },
          { targetType: 'YEAR_GROUP' },
          { targetType: 'ROLE_ONLY' },
        ] : []),
      ],
    };

    const where = { ...targetFilter };

    // Optional category filter
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
      include: {
        sentBy:      { select: { id: true, name: true } },
        attachments: true,
      },
    });

    return c.json({ success: true, data: notices });
  } catch (err) {
    console.error('GET /notices error:', err);
    return c.json({ success: false, message: 'Failed to fetch notices' }, 500);
  }
});

// ─── GET /notices/:id ────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const notice = await prisma.notice.findUnique({
      where: { id },
      include: {
        sentBy:      { select: { id: true, name: true } },
        attachments: true,
      },
    });
    if (!notice) return c.json({ success: false, message: 'Notice not found' }, 404);
    return c.json({ success: true, data: notice });
  } catch (err) {
    return c.json({ success: false, message: 'Failed to fetch notice' }, 500);
  }
});

// ─── POST /notices ────────────────────────────────────────────────────────────
// Admin only

router.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body   = await c.req.json();
    const parsed = noticeSchema.parse(body);
    const user   = c.get('user');

    // Clear irrelevant targeting fields based on targetType
    const targetDepartment = ['DEPARTMENT', 'YEAR_GROUP'].includes(parsed.targetType)
      ? parsed.targetDepartment ?? null
      : null;
    const targetYear = parsed.targetType === 'YEAR_GROUP'
      ? parsed.targetYear ?? null
      : null;
    const targetRole = parsed.targetType === 'ROLE_ONLY'
      ? parsed.targetRole ?? null
      : null;

    const notice = await prisma.notice.create({
      data: {
        title:            parsed.title,
        body:             parsed.body,
        category:         parsed.category,
        pinned:           parsed.pinned,
        icon:             parsed.icon,
        targetType:       parsed.targetType,
        targetDepartment,
        targetYear,
        targetRole,
        sentById:         user.id,
      },
      include: {
        sentBy:      { select: { id: true, name: true } },
        attachments: true,
      },
    });

    return c.json({ success: true, data: notice }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, message: err.errors[0].message }, 400);
    }
    console.error('POST /notices error:', err);
    return c.json({ success: false, message: 'Failed to create notice' }, 500);
  }
});

// ─── PATCH /notices/:id ────────────────────────────────────────────────────────
// Admin only

router.patch('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id     = parseInt(c.req.param('id'));
    const body   = await c.req.json();
    const parsed = noticeSchema.partial().parse(body);

    // Clean targeting fields if targetType is changing
    const updateData = { ...parsed };
    if (parsed.targetType) {
      updateData.targetDepartment = ['DEPARTMENT', 'YEAR_GROUP'].includes(parsed.targetType)
        ? (parsed.targetDepartment ?? null)
        : null;
      updateData.targetYear = parsed.targetType === 'YEAR_GROUP'
        ? (parsed.targetYear ?? null)
        : null;
      updateData.targetRole = parsed.targetType === 'ROLE_ONLY'
        ? (parsed.targetRole ?? null)
        : null;
    }

    const notice = await prisma.notice.update({
      where: { id },
      data:  updateData,
      include: {
        sentBy:      { select: { id: true, name: true } },
        attachments: true,
      },
    });

    return c.json({ success: true, data: notice });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, message: err.errors[0].message }, 400);
    }
    console.error('PATCH /notices error:', err);
    return c.json({ success: false, message: 'Failed to update notice' }, 500);
  }
});

// ─── DELETE /notices/:id ───────────────────────────────────────────────────────
// Admin only

router.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    // Delete attachments first (if Cloudinary integration added in Phase 3, delete files here)
    await prisma.attachment.deleteMany({ where: { noticeId: id } });
    await prisma.notice.delete({ where: { id } });

    return c.json({ success: true, message: 'Notice deleted' });
  } catch (err) {
    console.error('DELETE /notices error:', err);
    return c.json({ success: false, message: 'Failed to delete notice' }, 500);
  }
});

module.exports = router;