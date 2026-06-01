const prisma = require('../db');
const { deriveCurrentYear } = require('./deriveCurrentYear');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

function isValidExpoToken(token) {
  return typeof token === 'string' && token.startsWith('ExponentPushToken[');
}

/**
 * Send one push notification via Expo Push API.
 */
async function sendPush(pushToken, title, body, data = {}) {
  if (!isValidExpoToken(pushToken)) return;

  const res = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
    },
    body: JSON.stringify({
      to:    pushToken,
      title,
      body,
      sound: 'default',
      data,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[push] Expo API error:', res.status, text);
  }
}

/**
 * Send the same notification to many tokens (batched, max 100 per request).
 */
async function sendPushToMany(tokens, title, body, data = {}) {
  const unique = [...new Set(tokens)].filter(isValidExpoToken);
  if (!unique.length) return;

  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100);
    const messages = chunk.map((to) => ({ to, title, body, sound: 'default', data }));

    const res = await fetch(EXPO_PUSH_URL, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[push] Expo batch error:', res.status, text);
    }
  }
}

function fireAndForget(promise) {
  Promise.resolve(promise).catch((err) => {
    console.error('[push]', err.message || err);
  });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDepartment(dept) {
  if (!dept) return 'CST';
  return dept
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

/** Notify all app users when a lecturer registers leave (auto-approved). */
async function notifyLecturerLeaveSubmitted(leave, lecturer) {
  const users = await prisma.user.findMany({
    where:   { pushToken: { not: null } },
    select:  { id: true, pushToken: true },
  });

  const tokens = users
    .filter((u) => u.id !== lecturer.id)
    .map((u) => u.pushToken);

  const start = formatDate(leave.startDate);
  const end   = formatDate(leave.endDate);
  const dept  = formatDepartment(lecturer.department);
  const body  = `${lecturer.name} (${dept}) is on leave from ${start} to ${end}.`;

  await sendPushToMany(tokens, 'Lecturer on Leave', body, {
    type:    'lecturer_leave',
    leaveId: leave.id,
  });
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function notifyLeaveStatus(leave, status) {
  const token = leave.user?.pushToken;
  if (!token) return;

  if (status === 'APPROVED') {
    await sendPush(token, 'Leave approved', 'Your leave request has been approved.');
  } else if (status === 'REJECTED') {
    await sendPush(token, 'Leave rejected', 'Your leave request was rejected.');
  }
}

async function notifyStudentsLecturerOnLeave(leave, lecturer) {
  const schedules = await prisma.schedule.findMany({
    where:   { lecturerId: lecturer.id },
    select:  { department: true, year: true },
  });
  if (!schedules.length) return;

  const pairKeys = new Set(schedules.map((s) => `${s.department}:${s.year}`));
  const departments = [...new Set(schedules.map((s) => s.department))];

  const students = await prisma.user.findMany({
    where: {
      role:      'STUDENT',
      department: { in: departments },
      pushToken:  { not: null },
    },
    select: { pushToken: true, department: true, intakeYear: true },
  });

  const tokens = students
    .filter((s) => {
      const year = deriveCurrentYear(s.intakeYear);
      return year && pairKeys.has(`${s.department}:${year}`);
    })
    .map((s) => s.pushToken);

  const start = formatDate(leave.startDate);
  const end   = formatDate(leave.endDate);
  await sendPushToMany(
    tokens,
    'Lecturer on leave',
    `${lecturer.name} is on leave from ${start} to ${end}`
  );
}

async function notifyBookingStatus(booking, status) {
  const student = await prisma.user.findUnique({
    where:  { id: booking.userId },
    select: { pushToken: true },
  });
  if (!student?.pushToken) return;

  const facility = booking.facility?.name || 'facility';
  if (status === 'APPROVED') {
    await sendPush(
      student.pushToken,
      'Booking approved',
      `Your booking for ${facility} has been approved`
    );
  } else if (status === 'REJECTED') {
    await sendPush(
      student.pushToken,
      'Booking rejected',
      `Your booking for ${facility} was rejected`
    );
  }
}

async function getPushTokensForNotice(notice) {
  const base = { pushToken: { not: null } };
  let users = [];

  if (notice.targetType === 'EVERYONE' || !notice.targetType) {
    users = await prisma.user.findMany({
      where: base,
      select: { pushToken: true },
    });
  } else if (notice.targetType === 'DEPARTMENT') {
    users = await prisma.user.findMany({
      where: { ...base, department: notice.targetDepartment },
      select: { pushToken: true },
    });
  } else if (notice.targetType === 'YEAR_GROUP') {
    const students = await prisma.user.findMany({
      where: {
        ...base,
        role:       'STUDENT',
        department: notice.targetDepartment,
      },
      select: { pushToken: true, intakeYear: true },
    });
    users = students.filter(
      (s) => deriveCurrentYear(s.intakeYear) === notice.targetYear
    );
  } else if (notice.targetType === 'ROLE_ONLY') {
    const role = notice.targetRole === 'STUDENTS_ONLY' ? 'STUDENT' : 'LECTURER';
    users = await prisma.user.findMany({
      where: { ...base, role },
      select: { pushToken: true },
    });
  }

  return users.map((u) => u.pushToken).filter(Boolean);
}

async function notifyNewNotice(notice) {
  const tokens = await getPushTokensForNotice(notice);
  await sendPushToMany(tokens, 'New notice', `New notice: ${notice.title}`, {
    type: 'notice',
    noticeId: notice.id,
  });
}

module.exports = {
  sendPush,
  sendPushToMany,
  fireAndForget,
  notifyLeaveStatus,
  notifyStudentsLecturerOnLeave,
  notifyLecturerLeaveSubmitted,
  notifyBookingStatus,
  notifyNewNotice,
};
