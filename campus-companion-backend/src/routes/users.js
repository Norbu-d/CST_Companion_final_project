const { Hono } = require('hono');
const { z } = require('zod');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = new Hono();

const pushTokenSchema = z.object({
  pushToken: z.string().min(1),
});

// POST /users/push-token — Save Expo push token for the logged-in user
router.post('/push-token', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { pushToken } = pushTokenSchema.parse(body);

    await prisma.user.update({
      where: { id: user.id },
      data:  { pushToken },
    });

    return c.json({ success: true, message: 'Push token saved' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? err.errors?.[0]?.message ?? 'Invalid body';
      return c.json({ success: false, message: msg }, 400);
    }
    console.error('POST /users/push-token error:', err);
    return c.json({ success: false, message: 'Failed to save push token' }, 500);
  }
});

module.exports = router;
