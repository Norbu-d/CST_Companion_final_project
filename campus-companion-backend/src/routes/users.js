const { Hono } = require('hono');
const { z } = require('zod');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { deriveCurrentYear } = require('../utils/deriveCurrentYear');

const router = new Hono();

const userProfileSelect = {
  id:          true,
  studentId:   true,
  name:        true,
  email:       true,
  role:        true,
  department:  true,
  contact:     true,
  intakeYear:  true,
  semester:    true,
  programme:   true,
  isRepeating: true,
  designation: true,
  officeHours: true,
  createdAt:   true,
};

function toProfileResponse(user) {
  const currentYear =
    user.role === 'STUDENT' ? deriveCurrentYear(user.intakeYear) : null;
  return { ...user, currentYear };
}

const pushTokenSchema = z.object({
  pushToken: z.string().min(1),
});

const studentPatchSchema = z.object({
  contact: z.string().max(30).nullable().optional(),
});

const lecturerPatchSchema = z.object({
  contact:     z.string().max(30).nullable().optional(),
  officeHours: z.string().max(200).nullable().optional(),
});

// GET /users/me — Current user profile (no password)
router.get('/me', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user');
    const user = await prisma.user.findUnique({
      where:  { id: authUser.id },
      select: userProfileSelect,
    });

    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404);
    }

    return c.json({ success: true, data: toProfileResponse(user) });
  } catch (err) {
    console.error('GET /users/me error:', err);
    return c.json({ success: false, message: 'Failed to load profile' }, 500);
  }
});

// PATCH /users/me — Students: contact; Lecturers: contact + officeHours
router.patch('/me', authMiddleware, async (c) => {
  try {
    const authUser = c.get('user');
    const body = await c.req.json();

    if (authUser.role === 'ADMIN') {
      return c.json({
        success: false,
        message: 'Profile updates for admins are not supported in the mobile app',
      }, 403);
    }

    let data;
    if (authUser.role === 'STUDENT') {
      data = studentPatchSchema.parse(body);
    } else if (authUser.role === 'LECTURER') {
      data = lecturerPatchSchema.parse(body);
    } else {
      return c.json({ success: false, message: 'Forbidden' }, 403);
    }

    const user = await prisma.user.update({
      where:  { id: authUser.id },
      data,
      select: userProfileSelect,
    });

    return c.json({ success: true, data: toProfileResponse(user) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.issues?.[0]?.message ?? err.errors?.[0]?.message ?? 'Invalid body';
      return c.json({ success: false, message: msg }, 400);
    }
    console.error('PATCH /users/me error:', err);
    return c.json({ success: false, message: 'Failed to update profile' }, 500);
  }
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
