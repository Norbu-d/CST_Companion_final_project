/**
 * Derive the current academic year (1–4) from the student's intake year.
 * Academic year starts in August (month index 7).
 */
function deriveCurrentYear(intakeYear, academicStartMonth = 7) {
  if (!intakeYear) return null;
  const now = new Date();
  const academicYearStart =
    now.getMonth() >= academicStartMonth
      ? now.getFullYear()
      : now.getFullYear() - 1;
  const year = academicYearStart - intakeYear + 1;
  return Math.min(Math.max(year, 1), 4);
}

module.exports = { deriveCurrentYear };
