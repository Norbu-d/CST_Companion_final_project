const prisma = require('../src/db');
const bcrypt = require('bcryptjs');

async function main() {

  // ─── Admin ────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@cst.edu.bt' },
    update: {},
    create: {
      studentId: 'ADMIN001',
      name:      'CST Admin',
      email:     'admin@cst.edu.bt',
      password:  await bcrypt.hash('admin123', 10),
      role:      'ADMIN',
    },
  });

  // ─── Test Student ─────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'student@cst.edu.bt' },
    update: {},
    create: {
      studentId:   'STD220001',
      name:        'Tenzin Dorji',
      email:       'student@cst.edu.bt',
      password:    await bcrypt.hash('student123', 10),
      role:        'STUDENT',
      department:  'SOFTWARE_ENGINEERING',
      intakeYear:  2022,
      semester:    2,
      isRepeating: false,
    },
  });

  // ─── Test Lecturer ────────────────────────────────────────────────────────
  // Use a unique test lecturer ID to avoid conflicts with imported lecturers
  await prisma.user.upsert({
    where: { email: 'testlecturer@cst.edu.bt' },
    update: {
      name:        'Sonam Tshering',
      password:    await bcrypt.hash('lecturer123', 10),
      role:        'LECTURER',
      department:  'SOFTWARE_ENGINEERING',
      contact:     '+975-5-336402',
      designation: 'SENIOR_LECTURER',
      officeHours: 'Mon–Thu 14:00–17:00',
    },
    create: {
      studentId:   'L999',
      name:        'Sonam Tshering',
      email:       'testlecturer@cst.edu.bt',
      password:    await bcrypt.hash('lecturer123', 10),
      role:        'LECTURER',
      department:  'SOFTWARE_ENGINEERING',
      contact:     '+975-5-336402',
      designation: 'SENIOR_LECTURER',
      officeHours: 'Mon–Thu 14:00–17:00',
    },
  });

  // ─── Schedule ─────────────────────────────────────────────────────────────
  // Phase 1 complete — schedule entries now include department, year, semester, academicYear
  // These are sample entries for Year 3 Software Engineering Semester 2, Academic Year 2025-26
  const schedule = [
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Monday',    time: '08:00–09:50', subject: 'Cross Platform Development', room: 'Lab 2', type: 'Lab',      lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Monday',    time: '10:00–10:50', subject: 'Software Engineering',        room: 'LT-1',  type: 'Lecture',  lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Tuesday',   time: '08:00–08:50', subject: 'Database Systems',            room: 'LT-2',  type: 'Lecture',  lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Tuesday',   time: '14:00–15:50', subject: 'Database Systems',            room: 'Lab 1', type: 'Lab',      lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Wednesday', time: '10:00–10:50', subject: 'Cross Platform Development',  room: 'LT-1',  type: 'Lecture',  lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Thursday',  time: '08:00–08:50', subject: 'Software Engineering',        room: 'LT-3',  type: 'Tutorial', lecturerId: null },
    { department: 'SOFTWARE_ENGINEERING', year: 3, semester: 2, academicYear: '2025-26', day: 'Friday',    time: '14:00–15:50', subject: 'Cross Platform Development',  room: 'Lab 2', type: 'Lab',      lecturerId: null },
  ];
  await prisma.schedule.createMany({ data: schedule, skipDuplicates: true });

  // ─── Notices ──────────────────────────────────────────────────────────────
  await prisma.notice.createMany({
    data: [
      {
        title:    'End Semester Exam Schedule Released',
        body:     'The end semester examination schedule for Semester 2 has been released. Please check the notice board.',
        category: 'Exam',
        pinned:   true,
      },
      {
        title:    'Library Hours Extended',
        body:     'The CST library will remain open until 10 PM during the examination period.',
        category: 'Academic',
        pinned:   false,
      },
      {
        title:    'Annual Sports Day 2026',
        body:     'Annual Sports Day will be held on 25 April 2026. All students are encouraged to participate.',
        category: 'Event',
        pinned:   false,
      },
    ],
    skipDuplicates: true,
  });

  // ─── Facilities ───────────────────────────────────────────────────────────
  await prisma.facility.createMany({
    data: [
      {
        facilityKey: 'football',
        name:        'Football Ground',
        description: 'Full-size grass football pitch',
        capacity:    22,
        location:    'South Campus',
        color:       'green',
        icon:        'football',
        rules:       ['Book 24hrs in advance', 'Max 2hrs per booking', 'Clean up after use'],
      },
      {
        facilityKey: 'hall',
        name:        'Conventional Hall',
        description: 'Main auditorium for events',
        capacity:    300,
        location:    'Main Building',
        color:       'purple',
        icon:        'business',
        rules:       ['Request approval from Dean', 'Return keys after use', 'No food inside'],
      },
      {
        facilityKey: 'lab1',
        name:        'Lab 1',
        description: 'Computer lab with 40 workstations',
        capacity:    40,
        location:    'Block A',
        color:       'blue',
        icon:        'desktop',
        rules:       ['Lab coat required', 'No food or drinks', 'Log off after use'],
      },
      {
        facilityKey: 'lab2',
        name:        'Lab 2',
        description: 'Computer lab with 40 workstations',
        capacity:    40,
        location:    'Block A',
        color:       'amber',
        icon:        'desktop',
        rules:       ['Lab coat required', 'No food or drinks', 'Log off after use'],
      },
      {
        facilityKey: 'lab3',
        name:        'Lab 3',
        description: 'Hardware and networking lab',
        capacity:    30,
        location:    'Block B',
        color:       'teal',
        icon:        'hardware-chip',
        rules:       ['Handle equipment carefully', 'Report damage immediately', 'No unauthorized installs'],
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });