const prisma = require('../db');
const { broadcastNewNotice } = require('../sse');
const { fireAndForget, notifyNewNotice } = require('./pushNotifications');

const noticeInclude = {
  sentBy:      { select: { id: true, name: true } },
  attachments: true,
};

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

/**
 * Post lecturer leave to the notice board (+ SSE live update + targeted push).
 */
async function createLeaveAnnouncementNotice(leave, lecturer) {
  if (!lecturer?.id) {
    console.error('[leaveNotice] Missing lecturer id');
    return null;
  }

  const start = formatDate(leave.startDate);
  const end   = formatDate(leave.endDate);
  const dept  = formatDepartment(lecturer.department);

  let body = `${lecturer.name} (${dept}) is on leave from ${start} to ${end}.`;
  if (leave.reason) body += ` Reason: ${leave.reason}`;
  body += ` [leave:${leave.id}]`;

  try {
  const notice = await prisma.notice.create({
    data: {
      title:    'Lecturer on Leave',
      body,
      category: 'Leave',
      pinned:   false,
      icon:     'bed-outline',
      targetType: 'EVERYONE',
      sentById: lecturer.id,
    },
  });

  const full = await prisma.notice.findUnique({
    where:   { id: notice.id },
    include: noticeInclude,
  });

  if (full) {
    broadcastNewNotice(full);
    fireAndForget(notifyNewNotice(full));
  }

  return full;
  } catch (err) {
    console.error('[leaveNotice] Failed to create notice:', err.message);
    return null;
  }
}

module.exports = { createLeaveAnnouncementNotice };
