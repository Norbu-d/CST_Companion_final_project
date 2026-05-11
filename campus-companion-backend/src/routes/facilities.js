const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = new Hono();

router.use('/*', authMiddleware);

router.get('/', async (c) => {
  const facilities = await prisma.facility.findMany({ orderBy: { name: 'asc' } });
  return c.json({ success: true, data: facilities });
});

router.get('/:key', async (c) => {
  const facilityKey = c.req.param('key');
  const facility = await prisma.facility.findUnique({ where: { facilityKey } });

  if (!facility) return c.json({ success: false, message: 'Facility not found' }, 404);

  return c.json({ success: true, data: facility });
});

module.exports = router;