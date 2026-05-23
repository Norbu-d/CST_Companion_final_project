const { Hono } = require('hono');
const prisma = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { buildNoticeTargetFilter } = require('../utils/noticeTargeting');
const { deleteStoredFile } = require('../utils/fileUpload');
const { fireAndForget, notifyNewNotice } = require('../utils/pushNotifications');
const { z } = require('zod');

const router = new Hono();

// ─── Validation ───────────────────────────────────────────────────────────────

const DepartmentEnum = z.enum([
  'SOFTWARE_ENGINEERING',
  'INFORMATION_TECHNOLOGY',
  'ELECTRICAL_ENGINEERING',
  'CIVIL_ENGINEERING',
  'MECHANICAL_ENGINEERING',
  'ELECTRONICS_ENGINEERING',
  'INSTRUMENTATION_ENGINEERING',
  'ARCHITECTURE',
  'WATER_RESOURCE_ENGINEERING',
  'GEOLOGY',
]);

const noticeSchema = z.object({
  title:            z.string().min(1),
  body:             z.string().min(1),
  category:         z.string().min(1),
  pinned:           z.boolean().optional().default(false),
  icon:             z.string().optional().default('megaphone'),
  targetType:       z.enum(['EVERYONE', 'DEPARTMENT', 'YEAR_GROUP', 'ROLE_ONLY']).optional().default('EVERYONE'),
  targetDepartment: DepartmentEnum.optional().nullable(),
  targetYear:       z.number().int().min(1).max(4).optional().nullable(),
  targetRole:       z.enum(['STUDENTS_ONLY', 'LECTURERS_ONLY']).optional().nullable(),
});

const attachmentInputSchema = z.object({
  fileUrl:  z.string().url(),
  fileName: z.string().min(1),
  fileType: z.enum(['IMAGE', 'PDF', 'DOCUMENT']),
  fileSize: z.number().int().positive(),
});

const attachmentsSchema = z.array(attachmentInputSchema).optional();
const removeAttachmentIdsSchema = z.array(z.number().int()).optional();

const noticeInclude = {
  sentBy:      { select: { id: true, name: true } },
  attachments: true,
};

async function addAttachments(noticeId, attachments) {
  if (!attachments?.length) return;
  await prisma.attachment.createMany({
    data: attachments.map((a) => ({
      noticeId,
      fileUrl:  a.fileUrl,
      fileName: a.fileName,
      fileType: a.fileType,
      fileSize: a.fileSize,
    })),
  });
}

async function removeAttachments(noticeId, removeIds) {
  if (!removeIds?.length) return;
  const rows = await prisma.attachment.findMany({
    where: { id: { in: removeIds }, noticeId },
  });
  for (const att of rows) {
    await deleteStoredFile(att.fileUrl);
  }
  await prisma.attachment.deleteMany({
    where: { id: { in: removeIds }, noticeId },
  });
}

// ─── GET /notices ─────────────────────────────────────────────────────────────
// Authenticated — returns only notices relevant to the requesting user

router.get('/', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const category = c.req.query('category');

    const where = { ...buildNoticeTargetFilter(user) };

    // Optional category filter
    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { date: 'desc' }],
      include: noticeInclude,
    });

    return c.json({ success: true, data: notices });
  } catch (err) {
    console.error('GET /notices error:', err);
    return c.json({ success: false, message: 'Failed to fetch notices' }, 500);
  }
});

// ─── GET /notices/:id ────────────────────────────────────────────────────────

router.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const id   = parseInt(c.req.param('id'));

    const notice = await prisma.notice.findFirst({
      where: {
        id,
        ...buildNoticeTargetFilter(user),
      },
      include: noticeInclude,
    });
    if (!notice) return c.json({ success: false, message: 'Notice not found' }, 404);
    return c.json({ success: true, data: notice });
  } catch (err) {
    return c.json({ success: false, message: 'Failed to fetch notice' }, 500);
  }
});

// ─── POST /notices ────────────────────────────────────────────────────────────
// Admin only

router.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const attachments = attachmentsSchema.parse(body.attachments);
    const parsed = noticeSchema.parse(body);
    const user   = c.get('user');

    if (['DEPARTMENT', 'YEAR_GROUP'].includes(parsed.targetType) && !parsed.targetDepartment) {
      return c.json({ success: false, message: 'targetDepartment is required for this target type' }, 400);
    }
    if (parsed.targetType === 'YEAR_GROUP' && !parsed.targetYear) {
      return c.json({ success: false, message: 'targetYear is required for year group notices' }, 400);
    }
    if (parsed.targetType === 'ROLE_ONLY' && !parsed.targetRole) {
      return c.json({ success: false, message: 'targetRole is required for role-only notices' }, 400);
    }

    // Clear irrelevant targeting fields based on targetType
    const targetDepartment = ['DEPARTMENT', 'YEAR_GROUP'].includes(parsed.targetType)
      ? parsed.targetDepartment ?? null
      : null;
    const targetYear = parsed.targetType === 'YEAR_GROUP'
      ? parsed.targetYear ?? null
      : null;
    const targetRole = parsed.targetType === 'ROLE_ONLY'
      ? parsed.targetRole ?? null
      : null;

    const notice = await prisma.notice.create({
      data: {
        title:            parsed.title,
        body:             parsed.body,
        category:         parsed.category,
        pinned:           parsed.pinned,
        icon:             parsed.icon,
        targetType:       parsed.targetType,
        targetDepartment,
        targetYear,
        targetRole,
        sentById:         user.id,
      },
    });

    await addAttachments(notice.id, attachments);

    const full = await prisma.notice.findUnique({
      where:   { id: notice.id },
      include: noticeInclude,
    });

    if (full) {
      fireAndForget(notifyNewNotice(full));
    }

    return c.json({ success: true, data: full }, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, message: err.errors[0].message }, 400);
    }
    console.error('POST /notices error:', err);
    return c.json({ success: false, message: 'Failed to create notice' }, 500);
  }
});

// ─── PATCH /notices/:id ────────────────────────────────────────────────────────
// Admin only

router.patch('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id     = parseInt(c.req.param('id'));
    const body   = await c.req.json();
    const attachments = attachmentsSchema.parse(body.attachments);
    const removeAttachmentIds = removeAttachmentIdsSchema.parse(body.removeAttachmentIds);
    const parsed = noticeSchema.partial().parse(body);

    // Clean targeting fields if targetType is changing
    const updateData = { ...parsed };
    if (parsed.targetType) {
      updateData.targetDepartment = ['DEPARTMENT', 'YEAR_GROUP'].includes(parsed.targetType)
        ? (parsed.targetDepartment ?? null)
        : null;
      updateData.targetYear = parsed.targetType === 'YEAR_GROUP'
        ? (parsed.targetYear ?? null)
        : null;
      updateData.targetRole = parsed.targetType === 'ROLE_ONLY'
        ? (parsed.targetRole ?? null)
        : null;
    }

    await prisma.notice.update({ where: { id }, data: updateData });
    await removeAttachments(id, removeAttachmentIds);
    await addAttachments(id, attachments);

    const notice = await prisma.notice.findUnique({
      where:   { id },
      include: noticeInclude,
    });

    return c.json({ success: true, data: notice });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return c.json({ success: false, message: err.errors[0].message }, 400);
    }
    console.error('PATCH /notices error:', err);
    return c.json({ success: false, message: 'Failed to update notice' }, 500);
  }
});

// ─── DELETE /notices/:id ───────────────────────────────────────────────────────
// Admin only

router.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const attachments = await prisma.attachment.findMany({ where: { noticeId: id } });
    for (const att of attachments) {
      await deleteStoredFile(att.fileUrl);
    }
    await prisma.attachment.deleteMany({ where: { noticeId: id } });
    await prisma.notice.delete({ where: { id } });

    return c.json({ success: true, message: 'Notice deleted' });
  } catch (err) {
    console.error('DELETE /notices error:', err);
    return c.json({ success: false, message: 'Failed to delete notice' }, 500);
  }
});

module.exports = router;