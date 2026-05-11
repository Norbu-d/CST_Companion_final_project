const { z } = require('zod');

const registerSchema = z.object({
  studentId:  z.string().min(3, 'Student ID required'),
  name:       z.string().min(2, 'Name too short'),
  email:      z.string().email('Invalid email'),
  password:   z.string().min(6, 'Password must be at least 6 characters'),
  contact:    z.string().optional(),
  department: z.string().optional(),
  year:       z.string().optional(),
});

// ✅ Accepts either a valid email OR a studentId (e.g. "02241241")
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email or Student ID is required')
    .refine(
      (val) => val.includes('@')
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)  // validate as email
        : val.trim().length > 0,                    // or accept as studentId
      { message: 'Enter a valid email or Student ID' }
    ),
  password: z.string().min(1, 'Password is required'),
});

module.exports = { registerSchema, loginSchema };