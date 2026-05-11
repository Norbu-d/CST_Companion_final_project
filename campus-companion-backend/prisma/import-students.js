/**
 * import-students.js
 *
 * Bulk imports students from an Excel (.xlsx) or CSV file into the database.
 *
 * Usage:
 *   node prisma/import-students.js                        ← uses prisma/data/students.csv
 *   node prisma/import-students.js path/to/file.csv
 *
 * Expected CSV columns (header row required):
 *   studentId | name | email | contact | department | intakeYear | semester | password (optional)
 *
 * If "password" column is missing or empty, defaults to the student's studentId.
 * Example default: studentId = "02241241" → password = "02241241"
 *
 * intakeYear = the year the student first enrolled (e.g. 2022)
 * Current year is calculated automatically: currentYear = currentAcademicYear - intakeYear + 1
 */

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const XLSX   = require('xlsx');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

// ─── Column name aliases ──────────────────────────────────────────────────────
const COLUMN_MAP = {
  studentId:   ['studentid', 'student_id', 'student id', 'id', 'regno', 'reg no', 'registration no'],
  name:        ['name', 'full name', 'fullname', 'student name'],
  email:       ['email', 'email address', 'mail'],
  contact:     ['contact', 'phone', 'mobile', 'contact no', 'phone no', 'mobile no'],
  department:  ['department', 'dept', 'programme', 'program', 'course'],
  intakeYear:  ['intakeyear', 'intake_year', 'intake year', 'year enrolled', 'enrolled year', 'year'],
  semester:    ['semester', 'sem', 'current semester'],
  isRepeating: ['isrepeating', 'is_repeating', 'repeating', 'repeat'],
  password:    ['password', 'pass', 'default password'],
};

// ─── Department string → Prisma enum value ────────────────────────────────────
const DEPARTMENT_MAP = {
  'software engineering':          'SOFTWARE_ENGINEERING',
  'information technology':        'INFORMATION_TECHNOLOGY',
  'electrical engineering':        'ELECTRICAL_ENGINEERING',
  'civil engineering':             'CIVIL_ENGINEERING',
  'mechanical engineering':        'MECHANICAL_ENGINEERING',
  'electronics engineering':       'ELECTRONICS_ENGINEERING',
  'instrumentation engineering':   'INSTRUMENTATION_ENGINEERING',
  'architecture':                  'ARCHITECTURE',
  'water resource engineering':    'WATER_RESOURCE_ENGINEERING',
  'geology':                       'GEOLOGY',
};

function mapDepartment(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return DEPARTMENT_MAP[key] ?? null;
}

// ─── FIX: Excel often reads studentId as a number, dropping leading zeros ─────
function parseStudentId(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  if (typeof raw === 'number') {
    return String(raw).padStart(8, '0'); // 2241241 → "02241241"
  }
  return String(raw).trim();
}

function parseIntakeYear(raw) {
  if (!raw) return null;
  const val = parseInt(String(raw).trim(), 10);
  return isNaN(val) ? null : val;
}

function parseSemester(raw) {
  if (!raw) return null;
  const val = parseInt(String(raw).trim(), 10);
  return isNaN(val) ? null : val;
}

function parseBoolean(raw) {
  if (!raw) return false;
  const val = String(raw).toLowerCase().trim();
  return val === 'true' || val === '1' || val === 'yes';
}

function normalizeHeaders(rawHeaders) {
  const map = {};
  rawHeaders.forEach((raw) => {
    const lower = raw.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
      if (aliases.includes(lower)) {
        map[field] = raw;
        break;
      }
    }
  });
  return map;
}

function parseFile(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: true });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

async function importStudents(filePath) {
  console.log(`\n📂 Reading file: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const rows = parseFile(filePath);

  if (rows.length === 0) {
    console.error('❌ File is empty or has no data rows.');
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  const colMap  = normalizeHeaders(headers);

  console.log('🗂  Detected columns:', colMap);
  console.log(`📊 Total rows to import: ${rows.length}\n`);

  const required = ['studentId', 'name', 'email'];
  const missing  = required.filter((f) => !colMap[f]);
  if (missing.length > 0) {
    console.error(`❌ Missing required columns: ${missing.join(', ')}`);
    console.error('   Please check your CSV headers match the expected names.');
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;

    const studentId  = parseStudentId(row[colMap.studentId]);
    const name       = String(row[colMap.name]  || '').trim();
    const email      = String(row[colMap.email] || '').trim();
    const contact    = colMap.contact     ? String(row[colMap.contact]     || '').trim() : '';
    const deptRaw    = colMap.department  ? String(row[colMap.department]  || '').trim() : '';
    const intakeYear = colMap.intakeYear  ? parseIntakeYear(row[colMap.intakeYear])      : null;
    const semester   = colMap.semester    ? parseSemester(row[colMap.semester])          : null;
    const isRepeating = colMap.isRepeating ? parseBoolean(row[colMap.isRepeating])       : false;
    const rawPass    = colMap.password    ? String(row[colMap.password]    || '').trim() : '';

    if (!studentId && !name && !email) continue;

    if (!studentId || !name || !email) {
      errors.push(`Row ${rowNum}: Missing studentId, name, or email — skipped.`);
      skipped++;
      continue;
    }

    if (!email.includes('@')) {
      errors.push(`Row ${rowNum}: Invalid email "${email}" — skipped.`);
      skipped++;
      continue;
    }

    // Map department string to enum value
    const department = mapDepartment(deptRaw);
    if (deptRaw && !department) {
      errors.push(`Row ${rowNum} (${studentId}): Unknown department "${deptRaw}" — skipped.`);
      skipped++;
      continue;
    }

    const plainPassword  = rawPass || studentId;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    try {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ studentId }, { email }] },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            studentId,
            name,
            email,
            password:    hashedPassword,
            contact:     contact     || undefined,
            department:  department  ?? undefined,
            intakeYear:  intakeYear  ?? undefined,
            semester:    semester    ?? undefined,
            isRepeating,
          },
        });
        updated++;
        process.stdout.write(`  ✏️  Updated: ${studentId} — ${name}\n`);
      } else {
        await prisma.user.create({
          data: {
            studentId,
            name,
            email,
            password:    hashedPassword,
            contact:     contact    || null,
            department:  department ?? null,
            intakeYear:  intakeYear ?? null,
            semester:    semester   ?? null,
            isRepeating,
            role:        'STUDENT',
          },
        });
        created++;
        process.stdout.write(`  ✅ Created: ${studentId} — ${name}\n`);
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${studentId}): ${err.message}`);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Created : ${created}`);
  console.log(`✏️  Updated : ${updated}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach((e) => console.log(`   ${e}`));
  }
  console.log('─────────────────────────────────\n');
  console.log('🎓 Import complete. Default password = Student ID (e.g. 02241241)');
  console.log('   Remind students to change their password after first login.\n');
}

const filePath = process.argv[2] || path.join(__dirname, 'data', 'students.csv');

importStudents(filePath)
  .catch((e) => { console.error('Fatal error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });