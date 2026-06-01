const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

/**
 * Resolve department filter from query + logged-in user.
 * scope=all     → no department filter
 * scope=mine    → user's department
 * scope=<ENUM>  → specific department (e.g. SOFTWARE_ENGINEERING)
 * (no scope)    → students default to their department; admin/lecturer see all
 */
function resolveDepartmentScope(user, scope) {
  if (scope === 'all') return null;

  if (scope && scope !== 'mine') {
    return scope;
  }

  if (scope === 'mine') {
    return user.department ?? null;
  }

  if (user.role === 'STUDENT') {
    return user.department ?? null;
  }

  return null;
}

// ─── GET /contacts ────────────────────────────────────────────────────────────
// Returns LECTURER users as contacts (department-scoped for students by default)
// Query: ?search=keyword  ?scope=all|mine|<Department enum>
router.get('/', async (c) => {
  try {
    const user   = c.get('user');
    const search = c.req.query('search');
    const scope  = c.req.query('scope');

    const department = resolveDepartmentScope(user, scope);

    if (user.role === 'STUDENT' && !department && scope !== 'all') {
      return c.json({
        success: true,
        data: [],
        message: 'Your profile has no department set. Contact the admin office.',
      });
    }

    const where = { role: 'LECTURER' };

    if (department) {
      where.department = department;
    }

    if (search) {
      const q = search.toLowerCase();
      where.OR = [
        { name:       { contains: q, mode: 'insensitive' } },
        { department: { contains: q, mode: 'insensitive' } },
      ];
    }

    const lecturers = await prisma.user.findMany({
      where,
      select: {
        id:         true,
        name:       true,
        email:      true,
        contact:    true,
        department: true,
      },
      orderBy: { name: 'asc' },
    });

    const data = lecturers.map((l) => ({
      id:          l.id,
      name:        l.name,
      role:        'Lecturer',
      phone:       l.contact ?? 'N/A',
      email:       l.email,
      department:  l.department,
      officeHours: 'Mon–Fri, 9:00–17:00',
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Fetch contacts error:', err);
    return c.json({ success: false, message: 'Failed to fetch contacts' }, 500);
  }
});

// ─── GET /contacts/:id ────────────────────────────────────────────────────────
router.get('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const lecturer = await prisma.user.findFirst({
      where: { id, role: 'LECTURER' },
      select: {
        id:         true,
        name:       true,
        email:      true,
        contact:    true,
        department: true,
      },
    });

    if (!lecturer) {
      return c.json({ success: false, message: 'Contact not found' }, 404);
    }

    const data = {
      id:          lecturer.id,
      name:        lecturer.name,
      role:        'Lecturer',
      phone:       lecturer.contact ?? 'N/A',
      email:       lecturer.email,
      department:  lecturer.department,
      officeHours: 'Mon–Fri, 9:00–17:00',
    };

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Fetch contact error:', err);
    return c.json({ success: false, message: 'Failed to fetch contact' }, 500);
  }
});

module.exports = router;
