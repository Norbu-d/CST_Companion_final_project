const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
const MAX_BYTES = 10 * 1024 * 1024;

const MIME_MAP = {
  'image/jpeg': 'IMAGE',
  'image/png':  'IMAGE',
  'image/gif':  'IMAGE',
  'image/webp': 'IMAGE',
  'application/pdf': 'PDF',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
};

function classifyType(mimeType, fileName) {
  if (mimeType && MIME_MAP[mimeType]) return MIME_MAP[mimeType];
  const ext = path.extname(fileName || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return 'IMAGE';
  if (ext === '.pdf') return 'PDF';
  if (['.doc', '.docx'].includes(ext)) return 'DOCUMENT';
  return null;
}

function isCloudinaryReady() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function getCloudinary() {
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key:    process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  } catch {
    throw new Error(
      'Cloudinary is configured in .env but the package is not installed. Run: npm install cloudinary'
    );
  }
}

function publicBaseUrl() {
  return process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function extractCloudinaryPublicId(fileUrl) {
  const marker = '/upload/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return null;
  let rest = fileUrl.slice(idx + marker.length);
  rest = rest.replace(/^v\d+\//, '');
  const dot = rest.lastIndexOf('.');
  if (dot > rest.lastIndexOf('/')) rest = rest.slice(0, dot);
  return rest;
}

async function uploadToCloudinary(buffer, originalName, mimeType) {
  const fileType = classifyType(mimeType, originalName);
  const cloudinary = getCloudinary();
  const resourceType = fileType === 'IMAGE' ? 'image' : 'raw';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: resourceType, folder: 'campus-companion/notices' },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          fileUrl:  result.secure_url,
          fileName: originalName,
          fileType,
          fileSize: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadToLocal(buffer, originalName, mimeType) {
  const fileType = classifyType(mimeType, originalName);
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  const ext = path.extname(originalName) || '';
  const stored = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const filePath = path.join(UPLOAD_DIR, stored);
  fs.writeFileSync(filePath, buffer);

  return {
    fileUrl:  `${publicBaseUrl()}/uploads/${stored}`,
    fileName: originalName,
    fileType,
    fileSize: buffer.length,
  };
}

async function uploadFile(buffer, originalName, mimeType) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty file');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('File too large (maximum 10 MB)');
  }

  const fileType = classifyType(mimeType, originalName);
  if (!fileType) {
    throw new Error('Allowed file types: JPG, PNG, PDF, DOC, DOCX');
  }

  if (isCloudinaryReady()) {
    return uploadToCloudinary(buffer, originalName, mimeType);
  }
  return uploadToLocal(buffer, originalName, mimeType);
}

async function deleteStoredFile(fileUrl) {
  if (!fileUrl) return;

  if (fileUrl.includes('cloudinary.com') && isCloudinaryReady()) {
    try {
      const cloudinary = getCloudinary();
      const publicId = extractCloudinaryPublicId(fileUrl);
      if (!publicId) return;
      const resourceType = fileUrl.includes('/image/upload/') ? 'image' : 'raw';
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
      console.error('Cloudinary delete failed:', err.message);
    }
    return;
  }

  const marker = '/uploads/';
  const idx = fileUrl.indexOf(marker);
  if (idx === -1) return;
  const name = path.basename(fileUrl.slice(idx + marker.length));
  const filePath = path.join(UPLOAD_DIR, name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

module.exports = {
  uploadFile,
  deleteStoredFile,
  classifyType,
  isCloudinaryReady,
};
