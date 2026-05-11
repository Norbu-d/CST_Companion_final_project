/**
 * import-lecturers.js
 *
 * Bulk imports lecturers from a CSV file into the User table with role = LECTURER.
 *
 * Usage:
 *   node prisma/import-lecturers.js                       ← uses prisma/data/lecturers.csv
 *   node prisma/import-lecturers.js path/to/file.csv
 *
 * Expected CSV columns (header row required):
 *   employeeId | name | email | contact | department | designation | officeHours | password (optional)
 *
 * Default password = employeeId (e.g. "L001") if no password column.
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
  employeeId:  ['employeeid', 'employee_id', 'studentid', 'student_id', 'id', 'emp id', 'empid'],
  name:        ['name', 'full name', 'fullname', 'lecturer name'],
  email:       ['email', 'email address', 'mail'],
  contact:     ['contact', 'phone', 'mobile', 'contact no', 'phone no'],
  department:  ['department', 'dept', 'division'],
  designation: ['designation', 'title', 'position', 'role title', 'job title'],
  officeHours: ['officehours', 'office hours', 'availability', 'hours'],
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

// ─── Designation string → Prisma enum value ───────────────────────────────────
const DESIGNATION_MAP = {
  'head of department':  'HEAD_OF_DEPARTMENT',
  'head_of_department':  'HEAD_OF_DEPARTMENT',
  'hod':                 'HEAD_OF_DEPARTMENT',
  'senior lecturer':     'SENIOR_LECTURER',
  'senior_lecturer':     'SENIOR_LECTURER',
  'lecturer':            'LECTURER',
  'lab technician':      'LAB_TECHNICIAN',
  'lab_technician':      'LAB_TECHNICIAN',
  'admin staff':         'ADMIN_STAFF',
  'admin_staff':         'ADMIN_STAFF',
};

function mapDepartment(raw) {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  return DEPARTMENT_MAP[key] ?? null;
}

function mapDesignation(raw) {
  if (!raw) return 'LECTURER'; // default to LECTURER if not specified
  const key = raw.toLowerCase().trim();
  return DESIGNATION_MAP[key] ?? 'LECTURER';
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

async function importLecturers(filePath) {
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

  const required = ['employeeId', 'name', 'email'];
  const missing  = required.filter((f) => !colMap[f]);
  if (missing.length > 0) {
    console.error(`❌ Missing required columns: ${missing.join(', ')}`);
    console.error('   Expected header names: employeeId, name, email');
    process.exit(1);
  }

  let created = 0, updated = 0, skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;

    const employeeId   = String(row[colMap.employeeId]   || '').trim();
    const name         = String(row[colMap.name]         || '').trim();
    const email        = String(row[colMap.email]        || '').trim();
    const contact      = colMap.contact     ? String(row[colMap.contact]     || '').trim() : '';
    const deptRaw      = colMap.department  ? String(row[colMap.department]  || '').trim() : '';
    const desigRaw     = colMap.designation ? String(row[colMap.designation] || '').trim() : '';
    const officeHours  = colMap.officeHours ? String(row[colMap.officeHours] || '').trim() : '';
    const rawPass      = colMap.password    ? String(row[colMap.password]    || '').trim() : '';

    if (!employeeId && !name && !email) continue;

    if (!employeeId || !name || !email) {
      errors.push(`Row ${rowNum}: Missing employeeId, name, or email — skipped.`);
      skipped++;
      continue;
    }

    if (!email.includes('@')) {
      errors.push(`Row ${rowNum}: Invalid email "${email}" — skipped.`);
      skipped++;
      continue;
    }

    // Map string values to Prisma enum values
    const department  = mapDepartment(deptRaw);
    const designation = mapDesignation(desigRaw);

    if (deptRaw && !department) {
      errors.push(`Row ${rowNum} (${employeeId}): Unknown department "${deptRaw}" — skipped.`);
      skipped++;
      continue;
    }

    const plainPassword  = rawPass || employeeId;
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    try {
      const existing = await prisma.user.findFirst({
        where: { OR: [{ studentId: employeeId }, { email }] },
      });

      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            studentId:   employeeId,
            name,
            email,
            password:    hashedPassword,
            contact:     contact     || undefined,
            department:  department  ?? undefined,
            designation: designation ?? undefined,
            officeHours: officeHours || undefined,
            role:        'LECTURER',
          },
        });
        updated++;
        process.stdout.write(`  ✏️  Updated: ${employeeId} — ${name} (${designation})\n`);
      } else {
        await prisma.user.create({
          data: {
            studentId:   employeeId,
            name,
            email,
            password:    hashedPassword,
            contact:     contact     || null,
            department:  department  ?? null,
            designation: designation,
            officeHours: officeHours || null,
            role:        'LECTURER',
          },
        });
        created++;
        process.stdout.write(`  ✅ Created: ${employeeId} — ${name} (${designation})\n`);
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${employeeId}): ${err.message}`);
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
  console.log('🎓 Import complete. Default password = Employee ID (e.g. L001)');
  console.log('   Remind lecturers to change their password after first login.\n');
}

const filePath = process.argv[2] || path.join(__dirname, 'data', 'lecturers.csv');

importLecturers(filePath)
  .catch((e) => { console.error('Fatal error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });