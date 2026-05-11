// campus-companion-backend/src/validators/booking.validator.js
const { z } = require('zod');

const bookingSchema = z.object({
  facilityId: z.number().int().positive('Invalid facility selected.'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.'),
  slots: z
    .array(z.number().int().min(0).max(8))
    .min(1, 'Please select at least one time slot.'),
  purpose: z
    .string()
    .min(5, 'Purpose is too short — please add a brief description (at least 5 characters).')
    .max(200, 'Purpose cannot exceed 200 characters.'),
});

module.exports = { bookingSchema };