const { Hono } = require('hono');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { uploadFile } = require('../utils/fileUpload');

const router = new Hono();

// POST /upload — Admin uploads a notice attachment (multipart field: file)
router.post('/', authMiddleware, adminMiddleware, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!file || typeof file === 'string') {
      return c.json({
        success: false,
        message: 'No file provided. Use multipart field name "file".',
      }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await uploadFile(buffer, file.name, file.type || 'application/octet-stream');

    return c.json({ success: true, data });
  } catch (err) {
    console.error('POST /upload error:', err);
    return c.json({
      success: false,
      message: err.message || 'Upload failed',
    }, 400);
  }
});

module.exports = router;
