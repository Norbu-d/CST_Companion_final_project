const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

router.get('/', async (c) => {
  const day = c.req.query('day');

  const schedule = await prisma.schedule.findMany({
    where: day ? { day: { equals: day, mode: 'insensitive' } } : undefined,
    orderBy: { time: 'asc' },
  });

  return c.json({ success: true, data: schedule });
});

module.exports = router;