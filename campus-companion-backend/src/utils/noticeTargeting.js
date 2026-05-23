const { deriveCurrentYear } = require('./deriveCurrentYear');

/**
 * Prisma `where` clause: notices visible to the given user.
 */
function buildNoticeTargetFilter(user) {
  const userYear = user.role === 'STUDENT' ? deriveCurrentYear(user.intakeYear) : null;

  return {
    OR: [
      { targetType: 'EVERYONE' },

      ...(user.department ? [{
        targetType:       'DEPARTMENT',
        targetDepartment: user.department,
      }] : []),

      ...(user.role === 'STUDENT' && user.department && userYear ? [{
        targetType:       'YEAR_GROUP',
        targetDepartment: user.department,
        targetYear:       userYear,
      }] : []),

      ...(user.role === 'STUDENT' ? [{
        targetType: 'ROLE_ONLY',
        targetRole: 'STUDENTS_ONLY',
      }] : []),

      ...(user.role === 'LECTURER' ? [{
        targetType: 'ROLE_ONLY',
        targetRole: 'LECTURERS_ONLY',
      }] : []),

      ...(user.role === 'ADMIN' ? [
        { targetType: 'DEPARTMENT' },
        { targetType: 'YEAR_GROUP' },
        { targetType: 'ROLE_ONLY' },
      ] : []),
    ],
  };
}

module.exports = { buildNoticeTargetFilter, deriveCurrentYear };
