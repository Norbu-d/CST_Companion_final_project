/**
 * import-notices.js
 *
 * Usage:
 *   node prisma/import-notices.js
 *   node prisma/import-notices.js path/to/notices.csv
 *
 * CSV columns:
 *   title, body, category, pinned, icon
 *
 * category options : Exam | Academic | Event | Notice
 * pinned options   : true | false
 * icon options     : megaphone | alert-circle | book | trophy | briefcase | wifi | code-slash
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

const VALID_CATEGORIES = ['Exam', 'Academic', 'Event', 'Notice'];

async function importNotices(filePath) {
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
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const title    = String(row['title']    || '').trim();
    const body     = String(row['body']     || '').trim();
    const category = String(row['category'] || 'Notice').trim();
    const pinnedRaw= String(row['pinned']   || 'false').trim().toLowerCase();
    const icon     = String(row['icon']     || 'megaphone').trim();

    if (!title && !body) continue;

    if (!title || !body) {
      errors.push(`Row ${rowNum}: Missing title or body — skipped.`);
      skipped++;
      continue;
    }

    // Normalise category — default to Notice if unrecognised
    const normCategory = VALID_CATEGORIES.find(
      c => c.toLowerCase() === category.toLowerCase()
    ) || 'Notice';

    // Parse pinned — accepts true/false/yes/no/1/0
    const pinned = ['true', 'yes', '1'].includes(pinnedRaw);

    try {
      // Notices are identified by title — update if same title exists
      const existing = await prisma.notice.findFirst({ where: { title } });

      if (existing) {
        await prisma.notice.update({
          where: { id: existing.id },
          data: { body, category: normCategory, pinned, icon },
        });
        process.stdout.write(`  ✏️  Updated: ${title}\n`);
      } else {
        await prisma.notice.create({
          data: { title, body, category: normCategory, pinned, icon },
        });
        created++;
        process.stdout.write(`  ✅ Created: ${title}\n`);
      }
    } catch (err) {
      errors.push(`Row ${rowNum} (${title}): ${err.message}`);
      skipped++;
    }
  }

  console.log('\n─────────────────────────────────');
  console.log(`✅ Created : ${created}`);
  console.log(`⏭️  Skipped : ${skipped}`);
  if (errors.length > 0) {
    console.log('\n⚠️  Errors:');
    errors.forEach(e => console.log(`   ${e}`));
  }
  console.log('─────────────────────────────────\n');
  console.log('📋 Notices import complete.\n');
}

const filePath = process.argv[2] || path.join(__dirname, 'data', 'notices.csv');

importNotices(filePath)
  .catch(e => { console.error('Fatal error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });