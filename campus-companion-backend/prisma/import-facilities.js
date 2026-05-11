/**
 * import-facilities.js
 *
 * Usage:
 *   node prisma/import-facilities.js
 *   node prisma/import-facilities.js path/to/facilities.csv
 *
 * CSV columns:
 *   facilityKey, name, description, capacity, location, color, icon, rules
 *
 * Rules column: separate multiple rules with a pipe | character
 * Example: "Book 24hrs in advance|Max 2hrs per booking|Clean up after use"
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function parseFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

async function importFacilities(filePath) {
  console.log(`\n📂 Reading file: ${filePath}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const rows = parseFile(filePath);

  if (rows.length === 0) {
    console.error('❌ File is empty.');
    process.exit(1);
  }

  console.log(`📊 Total rows to import: ${rows.length}\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const facilityKey = String(row['facilityKey'] || row['facility_key'] || row['key'] || '').trim();
    const name        = String(row['name']        || '').trim();
    const description = String(row['description'] || '').trim();
    const capacity    = parseInt(row['capacity'])  || 0;
    const location    = String(row['location']    || '').trim();
    const color       = String(row['color']       || 'blue').trim();
    const icon        = String(row['icon']        || 'business').trim();
    const rulesRaw    = String(row['rules']       || '').trim();

    if (!facilityKey && !name) continue;

    if (!facilityKey || !name) {
      errors.push(`Row ${rowNum}: Missing facilityKey or name — skipped.`);
      skipped++;
      continue;
    }

    // Split rules by pipe | character
    const rules = rulesRaw
      ? rulesRaw.split('|').map(r => r.trim()).filter(r => r.length > 0)
      : [];

    try {
      const existing = await prisma.facility.findUnique({ where: { facilityKey } });

      if (existing) {
        await prisma.facility.update({
          where: { facilityKey },
          data: { name, description, capacity, location, color, icon, rules },
        });
        updated++;
        process.stdout.write(`  ✏️  Updated: ${name}\n`);
      } else {
        await prisma.facility.create({
          data: { facilityKey, name, description, capacity, location, color, icon, rules },
        });
        created++;
        process.stdout.write(`  ✅ Created: ${name}\n`);
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${facilityKey}): ${err.message}`);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Created : ${created}`);
  console.log(`✏️  Updated : ${updated}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => console.log(`   ${e}`));
  }
  console.log('─────────────────────────────────\n');
  console.log('🏫 Facilities import complete.\n');
}

const filePath = process.argv[2] || path.join(__dirname, 'data', 'facilities.csv');

importFacilities(filePath)
  .catch(e => { console.error('Fatal error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });