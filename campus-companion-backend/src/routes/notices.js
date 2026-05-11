const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

// All authenticated users can read notices (students, lecturers, admins)
router.get('/', async (c) => {
  const category = c.req.query('category');

  const notices = await prisma.notice.findMany({
    where: category && category !== 'All' ? { category } : undefined,
    orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
  });

  return c.json({ success: true, data: notices });
});

// Admin only — create a notice
router.post('/', adminMiddleware, async (c) => {
  const { title, body, category, pinned, icon } = await c.req.json();

  if (!title || !body || !category) {
    return c.json({ success: false, message: 'title, body, and category are required' }, 400);
  }

  const notice = await prisma.notice.create({
    data: {
      title,
      body,
      category,
      pinned: pinned ?? false,
      icon: icon ?? 'megaphone',
    },
  });

  return c.json({ success: true, data: notice }, 201);
});

// Admin only — edit a notice
router.patch('/:id', adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  const updates = await c.req.json();

  const notice = await prisma.notice.update({
    where: { id },
    data: updates,
  });

  return c.json({ success: true, data: notice });
});

// Admin only — delete a notice
router.delete('/:id', adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));

  await prisma.notice.delete({ where: { id } });

  return c.json({ success: true, message: 'Notice deleted' });
});

module.exports = router;