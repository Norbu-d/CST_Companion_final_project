const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, lecturerMiddleware, adminMiddleware } = require('../middleware/auth');
const {
  fireAndForget,
  notifyLeaveStatus,
  notifyStudentsLecturerOnLeave,
} = require('../utils/pushNotifications');

const router = new Hono();

router.use('/*', authMiddleware);

// GET /lecturer/leave/all — All leave records across all lecturers
// ⚠ MUST be defined before /leave/:userId or Hono matches "all" as a userId
router.get('/leave/all', async (c) => {
  const leaves = await prisma.lecturerLeave.findMany({
    include: {
      user:       { select: { id: true, name: true, department: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  return c.json({ success: true, data: leaves });
});

// GET /lecturer/leave/:userId — Get a specific lecturer's leave history
router.get('/leave/:userId', async (c) => {
  const userId = parseInt(c.req.param('userId'));

  const leaves = await prisma.lecturerLeave.findMany({
    where: { userId },
    include: {
      user:       { select: { id: true, name: true, department: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { startDate: 'asc' },
  });

  return c.json({ success: true, data: leaves });
});

// GET /lecturer/on-leave — Lecturers on approved leave today
router.get('/on-leave', async (c) => {
  const today = new Date();

  const leaves = await prisma.lecturerLeave.findMany({
    where: {
      status:    'APPROVED',
      startDate: { lte: today },
      endDate:   { gte: today },
    },
    include: {
      user: { select: { id: true, name: true, department: true, email: true } },
    },
  });

  return c.json({ success: true, data: leaves });
});

// GET /lecturer/on-leave/department/:dept — APPROVED leave lecturers by department
router.get('/on-leave/department/:dept', async (c) => {
  const dept  = c.req.param('dept');
  const today = new Date();

  const leaves = await prisma.lecturerLeave.findMany({
    where: {
      status:    'APPROVED',
      startDate: { lte: today },
      endDate:   { gte: today },
      user:      { department: dept },
    },
    include: {
      user: { select: { id: true, name: true, department: true, email: true } },
    },
  });

  return c.json({ success: true, data: leaves });
});

// POST /lecturer/leave — Lecturer submits leave (starts as PENDING)
router.post('/leave', lecturerMiddleware, async (c) => {
  const user = c.get('user');
  const { startDate, endDate, reason, academicYear } = await c.req.json();

  if (!startDate || !endDate) {
    return c.json({ success: false, message: 'startDate and endDate are required' }, 400);
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);

  if (end < start) {
    return c.json({ success: false, message: 'endDate must be after startDate' }, 400);
  }

  const targetUserId = user.role === 'ADMIN'
    ? (c.req.query('userId') ? parseInt(c.req.query('userId')) : user.id)
    : user.id;

  const leave = await prisma.lecturerLeave.create({
    data: {
      userId:      targetUserId,
      startDate:   start,
      endDate:     end,
      reason:      reason      ?? null,
      academicYear: academicYear ?? null,
      status:      'PENDING',
    },
  });

  return c.json({ success: true, data: leave }, 201);
});

// PATCH /lecturer/leave/:id/status — Admin approve or reject leave
router.patch('/leave/:id/status', adminMiddleware, async (c) => {
  const id    = parseInt(c.req.param('id'));
  const { status } = await c.req.json();
  const admin = c.get('user');

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return c.json({ success: false, message: 'status must be APPROVED or REJECTED' }, 400);
  }

  const leave = await prisma.lecturerLeave.findUnique({ where: { id } });
  if (!leave) {
    return c.json({ success: false, message: 'Leave record not found' }, 404);
  }

  const updated = await prisma.lecturerLeave.update({
    where: { id },
    data:  { status, approvedById: admin.id },
    include: {
      user:       { select: { id: true, name: true, email: true, pushToken: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  });

  fireAndForget(notifyLeaveStatus(updated, status));
  if (status === 'APPROVED') {
    fireAndForget(notifyStudentsLecturerOnLeave(updated, updated.user));
  }

  return c.json({ success: true, data: updated });
});

// DELETE /lecturer/leave/:id — Lecturer cancels own leave; admin can cancel any
router.delete('/leave/:id', lecturerMiddleware, async (c) => {
  const user = c.get('user');
  const id   = parseInt(c.req.param('id'));

  const leave = await prisma.lecturerLeave.findUnique({ where: { id } });
  if (!leave) {
    return c.json({ success: false, message: 'Leave record not found' }, 404);
  }

  if (user.role === 'LECTURER' && leave.userId !== user.id) {
    return c.json({ success: false, message: 'Forbidden: You can only cancel your own leave' }, 403);
  }

  await prisma.lecturerLeave.delete({ where: { id } });

  return c.json({ success: true, message: 'Leave cancelled' });
});

module.exports = router;