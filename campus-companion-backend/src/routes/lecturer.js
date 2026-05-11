const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, lecturerMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

// Anyone can view a lecturer's leave periods (students need to know who's away)
router.get('/:userId/leave', async (c) => {
  const userId = parseInt(c.req.param('userId'));

  const leaves = await prisma.lecturerLeave.findMany({
    where: { userId },
    orderBy: { startDate: 'asc' },
  });

  return c.json({ success: true, data: leaves });
});

// Anyone can view all lecturers and their current leave status
router.get('/on-leave', async (c) => {
  const today = new Date();

  const leaves = await prisma.lecturerLeave.findMany({
    where: {
      startDate: { lte: today },
      endDate:   { gte: today },
    },
    include: {
      user: { select: { id: true, name: true, department: true, email: true } },
    },
  });

  return c.json({ success: true, data: leaves });
});

// Lecturer submits their own leave
router.post('/leave', lecturerMiddleware, async (c) => {
  const user = c.get('user');
  const { startDate, endDate, reason } = await c.req.json();

  if (!startDate || !endDate) {
    return c.json({ success: false, message: 'startDate and endDate are required' }, 400);
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (end < start) {
    return c.json({ success: false, message: 'endDate must be after startDate' }, 400);
  }

  // Lecturers can only submit leave for themselves; admins can submit for anyone
  const targetUserId = user.role === 'ADMIN'
    ? (c.req.query('userId') ? parseInt(c.req.query('userId')) : user.id)
    : user.id;

  const leave = await prisma.lecturerLeave.create({
    data: {
      userId: targetUserId,
      startDate: start,
      endDate: end,
      reason: reason ?? null,
    },
  });

  return c.json({ success: true, data: leave }, 201);
});

// Lecturer cancels their own leave; admin can cancel any
router.delete('/leave/:id', lecturerMiddleware, async (c) => {
  const user = c.get('user');
  const id = parseInt(c.req.param('id'));

  const leave = await prisma.lecturerLeave.findUnique({ where: { id } });

  if (!leave) {
    return c.json({ success: false, message: 'Leave record not found' }, 404);
  }

  // Lecturers can only delete their own leave records
  if (user.role === 'LECTURER' && leave.userId !== user.id) {
    return c.json({ success: false, message: 'Forbidden: You can only cancel your own leave' }, 403);
  }

  await prisma.lecturerLeave.delete({ where: { id } });

  return c.json({ success: true, message: 'Leave cancelled' });
});

module.exports = router;