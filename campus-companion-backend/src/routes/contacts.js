const { Hono } = require('hono');
const prisma = require('../db');

const router = new Hono();

// ─── GET /contacts ────────────────────────────────────────────────────────────
// Returns all LECTURER users as contacts
// Query param: ?search=keyword
router.get('/', async (c) => {
  try {
    const search = c.req.query('search');

    const where = { role: 'LECTURER' };

    if (search) {
      const q = search.toLowerCase();
      where.AND = {
        OR: [
          { name:       { contains: q, mode: 'insensitive' } },
          { department: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const lecturers = await prisma.user.findMany({
      where,
      select: {
        id:         true,
        name:       true,
        email:      true,
        contact:    true,   // phone number
        department: true,
        // Map User fields to what the mobile app expects
        // role field used to derive "Lecturer" label
      },
      orderBy: { name: 'asc' },
    });

    // Shape the response to match what ContactsScreen expects:
    // { id, name, role, phone, email, department, officeHours }
    const data = lecturers.map(l => ({
      id:          l.id,
      name:        l.name,
      role:        'Lecturer',
      phone:       l.contact ?? 'N/A',
      email:       l.email,
      department:  l.department ?? 'CST',
      officeHours: 'Mon–Fri, 9:00–17:00',
    }));

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Fetch contacts error:', err);
    return c.json({ success: false, message: 'Failed to fetch contacts' }, 500);
  }
});

// ─── GET /contacts/:id ────────────────────────────────────────────────────────
// Returns a single lecturer by their User id
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
      department:  lecturer.department ?? 'CST',
      officeHours: 'Mon–Fri, 9:00–17:00',
    };

    return c.json({ success: true, data });
  } catch (err) {
    console.error('Fetch contact error:', err);
    return c.json({ success: false, message: 'Failed to fetch contact' }, 500);
  }
});

module.exports = router;