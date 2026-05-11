const { Hono } = require('hono');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { loginSchema } = require('../validators/auth.validator');

const router = new Hono();

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// Accepts email OR studentId in the "email" field:
//   { "email": "tenzin@cst.edu.bt", "password": "02241241" }
//   { "email": "02241241",           "password": "02241241" }
router.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const identifier = data.email.trim();

    // Look up by email OR studentId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { studentId: identifier },
        ],
      },
    });

    if (!user) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401);
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      return c.json({ success: false, message: 'Invalid credentials' }, 401);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...userOut } = user;
    return c.json({ success: true, data: { user: userOut, token } });

  } catch (err) {
    console.error('Login error:', err);
    return c.json({ success: false, message: 'Login failed. Please try again.' }, 500);
  }
});

module.exports = router;