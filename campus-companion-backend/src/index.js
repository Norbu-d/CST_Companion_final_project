require('dotenv').config();
const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { cors } = require('hono/cors');
const { logger } = require('hono/logger');

const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const scheduleRoutes = require('./routes/schedule');
const noticeRoutes = require('./routes/notices');
const facilityRoutes = require('./routes/facilities');
const bookingRoutes = require('./routes/bookings');
const lecturerRoutes = require('./routes/lecturer');
const errorHandler = require('./middleware/errorHandler');

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:3001', 'http://localhost:8081', 'http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => c.json({ success: true, message: 'Campus Companion API is running 🎓' }));

// Routes
app.route('/auth', authRoutes);
app.route('/contacts', contactRoutes);
app.route('/schedule', scheduleRoutes);
app.route('/notices', noticeRoutes);
app.route('/facilities', facilityRoutes);
app.route('/bookings', bookingRoutes);
app.route('/lecturer', lecturerRoutes);

// Error handler
app.onError(errorHandler);

// 404 handler
app.notFound((c) => c.json({ success: false, message: 'Route not found' }, 404));

const PORT = process.env.PORT || 3000;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`🚀 Campus Companion API running at http://localhost:${PORT}`);
});