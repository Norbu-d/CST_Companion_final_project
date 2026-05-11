const jwt = require('jsonwebtoken');

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized: No token provided' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    c.set('user', decoded);
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