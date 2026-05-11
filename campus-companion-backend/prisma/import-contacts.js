/**
 * import-contacts.js
 * 
 * Bulk imports staff/faculty contacts from an Excel (.xlsx) or CSV file.
 * 
 * Usage:
 *   node prisma/import-contacts.js                        ← uses prisma/data/contacts.xlsx
 *   node prisma/import-contacts.js path/to/file.xlsx
 * 
 * Expected Excel/CSV columns (header row required):
 *   name | role | phone | email | department | officeHours (optional)
 * 
 * If "officeHours" is missing, defaults to "Mon–Fri, 9:00–17:00"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const COLUMN_MAP = {
  name:        ['name', 'full name', 'fullname', 'staff name', 'faculty name'],
  role:        ['role', 'designation', 'position', 'title', 'job title'],
  phone:       ['phone', 'contact', 'mobile', 'phone no', 'contact no', 'ext', 'extension'],
  email:       ['email', 'email address', 'mail'],
  department:  ['department', 'dept', 'division', 'section'],
  officeHours: ['officehours', 'office hours', 'availability', 'hours'],
};

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
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

async function importContacts(filePath) {
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
  const colMap = normalizeHeaders(headers);

  console.log('🗂  Detected columns:', colMap);
  console.log(`📊 Total rows to import: ${rows.length}\n`);

  const required = ['name', 'email'];
  const missing = required.filter((f) => !colMap[f]);
  if (missing.length > 0) {
    console.error(`❌ Missing required columns: ${missing.join(', ')}`);
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const name        = String(row[colMap.name]        || '').trim();
    const email       = String(row[colMap.email]       || '').trim();
    const role        = colMap.role        ? String(row[colMap.role]        || '').trim() : '';
    const phone       = colMap.phone       ? String(row[colMap.phone]       || '').trim() : '';
    const department  = colMap.department  ? String(row[colMap.department]  || '').trim() : '';
    const officeHours = colMap.officeHours ? String(row[colMap.officeHours] || '').trim() : 'Mon–Fri, 9:00–17:00';

    if (!name && !email) continue;

    if (!name || !email) {
      errors.push(`Row ${rowNum}: Missing name or email — skipped.`);
      skipped++;
      continue;
    }

    try {
      const existing = await prisma.contact.findFirst({ where: { email } });

      if (existing) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: { name, role, phone, department, officeHours: officeHours || 'Mon–Fri, 9:00–17:00' },
        });
        updated++;
        process.stdout.write(`  ✏️  Updated: ${name} (${department})\n`);
      } else {
        await prisma.contact.create({
          data: {
            name,
            role:        role        || 'Staff',
            phone:       phone       || 'N/A',
            email,
            department:  department  || 'General',
            officeHours: officeHours || 'Mon–Fri, 9:00–17:00',
          },
        });
        created++;
        process.stdout.write(`  ✅ Created: ${name} (${department})\n`);
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${name}): ${err.message}`);
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
  console.log('📋 Contacts import complete.\n');
}

const filePath = process.argv[2] || path.join(__dirname, 'data', 'contacts.xlsx');

importContacts(filePath)
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });