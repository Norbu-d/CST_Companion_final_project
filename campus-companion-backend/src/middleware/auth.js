const jwt = require('jsonwebtoken');
const prisma = require('../db');

const USER_SELECT = {
  id:          true,
  email:       true,
  role:        true,
  name:        true,
  department:  true,
  intakeYear:  true,
  isRepeating: true,
  semester:    true,
  studentId:   true,
  designation: true,
};

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where:  { id: decoded.id },
      select: USER_SELECT,
    });

    if (!user) {
      return c.json({ success: false, message: 'Unauthorized: User not found' }, 401);
    }

    c.set('user', user);
    await next();
  } catch (err) {
    return c.json({ success: false, message: 'Unauthorized: Invalid token' }, 401);
  }
};

const adminMiddleware = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Forbidden: Admins only' }, 403);
  }
  await next();
};

// Lecturers can access their own leave routes; admins can access everything
const lecturerMiddleware = async (c, next) => {
  const user = c.get('user');
  if (user?.role !== 'LECTURER' && user?.role !== 'ADMIN') {
    return c.json({ success: false, message: 'Forbidden: Lecturers only' }, 403);
  }
  await next();
};

module.exports = { authMiddleware, adminMiddleware, lecturerMiddleware };