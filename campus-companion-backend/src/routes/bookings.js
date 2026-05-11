const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { bookingSchema } = require('../validators/booking.validator');

const router = new Hono();

router.use('/*', authMiddleware);

// Get bookings for the logged-in student
router.get('/my', async (c) => {
  const user = c.get('user');

  const bookings = await prisma.booking.findMany({
    where: { userId: user.id },
    include: { facility: true },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ success: true, data: bookings });
});

// Get all booked slots for a facility + date, including who booked each slot
router.get('/slots', async (c) => {
  const { facilityId, date } = c.req.query();

  if (!facilityId || !date) {
    return c.json({ success: false, message: 'facilityId and date are required' }, 400);
  }

  const bookings = await prisma.booking.findMany({
    where: {
      facilityId: parseInt(facilityId),
      date,
      status: { not: 'REJECTED' },
    },
    select: {
      slots: true,
      status: true,
      user: { select: { name: true } },
    },
  });

  // Build a map: slotNumber -> { bookedBy, status }
  // First booking wins (FCFS) — earlier createdAt already filtered by Prisma order
  const slotMap = {};
  for (const booking of bookings) {
    for (const slot of booking.slots) {
      if (!slotMap[slot]) {
        slotMap[slot] = {
          bookedBy: booking.user.name,
          status: booking.status,
        };
      }
    }
  }

  return c.json({ success: true, data: { slotMap } });
});

// Create a booking — FCFS: PENDING counts as taken, no double-booking
router.post('/', async (c) => {
  const user = c.get('user');

  // Only students can book facilities
  if (user.role !== 'STUDENT') {
    return c.json({ success: false, message: 'Only students can make bookings' }, 403);
  }

  const body = await c.req.json();
  const data = bookingSchema.parse(body);

  // FCFS conflict check: any non-REJECTED booking on same facility+date+slots blocks this
  const existing = await prisma.booking.findFirst({
    where: {
      facilityId: data.facilityId,
      date: data.date,
      status: { not: 'REJECTED' },
      slots: { hasSome: data.slots },
    },
    include: {
      user: { select: { name: true } },
    },
  });

  if (existing) {
    return c.json({
      success: false,
      message: `One or more slots are already booked by ${existing.user.name}`,
    }, 409);
  }

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      facilityId: data.facilityId,
      date: data.date,
      slots: data.slots,
      purpose: data.purpose,
    },
    include: { facility: true },
  });

  return c.json({ success: true, data: booking }, 201);
});

// Admin: update booking status
router.patch('/:id/status', adminMiddleware, async (c) => {
  const id = parseInt(c.req.param('id'));
  const { status } = await c.req.json();

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return c.json({ success: false, message: 'Status must be APPROVED or REJECTED' }, 400);
  }

  const booking = await prisma.booking.update({
    where: { id },
    data: { status },
    include: { facility: true, user: { select: { name: true, email: true } } },
  });

  return c.json({ success: true, data: booking });
});

// Admin: get all bookings
router.get('/all', adminMiddleware, async (c) => {
  const bookings = await prisma.booking.findMany({
    include: {
      facility: true,
      user: { select: { id: true, name: true, email: true, studentId: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return c.json({ success: true, data: bookings });
});

module.exports = router;