/**
 * fix-passwords.js
 * 
 * One-off script to re-hash passwords for all existing students.
 * Sets each student's password = their studentId (with leading zeros).
 * 
 * Run: node prisma/fix-passwords.js
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

async function fixPasswords() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, studentId: true, name: true },
  });

  console.log(`\n🔧 Found ${students.length} students. Re-hashing passwords...\n`);

  let fixed = 0;
  for (const s of students) {
    // Ensure leading zeros — e.g. 2241241 → "02241241"
    const studentId = String(s.studentId).padStart(8, '0');
    const hashed    = await bcrypt.hash(studentId, 10);

    await prisma.user.update({
      where: { id: s.id },
      data:  { 
        studentId,        // also fix studentId itself if leading zero was stripped
        password: hashed,
      },
    });

    console.log(`  ✅ Fixed: ${studentId} — ${s.name}`);
    fixed++;
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`✅ Fixed ${fixed} student passwords.`);
  console.log(`   Default password = Student ID (e.g. 02241241)`);
  console.log(`─────────────────────────────────\n`);
}

fixPasswords()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });