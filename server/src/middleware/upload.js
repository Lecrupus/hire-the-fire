const multer = require('multer');
const ApiError = require('../utils/ApiError');

const MAX_BYTES = 2 * 1024 * 1024;

/** In-memory single-file upload limited to the given MIME types and 2 MB. */
const uploadSingle = (field, mimeTypes, label) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1 },
    fileFilter: (_req, file, cb) =>
      mimeTypes.includes(file.mimetype)
        ? cb(null, true)
        : cb(
            ApiError.badRequest(
              `${label} must be ${mimeTypes.map((m) => m.split('/')[1].toUpperCase()).join(' or ')}`,
            ),
          ),
  }).single(field);

const resumeUpload = uploadSingle('resume', ['application/pdf'], 'Resume');
const logoUpload = uploadSingle('logo', ['image/png', 'image/jpeg'], 'Logo');

/** Rejects files whose first bytes do not match their declared type (a renamed .exe is not a PDF). */
function checkMagicBytes(req, _res, next) {
  if (!req.file) return next(ApiError.badRequest('No file was uploaded'));
  const b = req.file.buffer;
  const ok =
    (req.file.mimetype === 'application/pdf' && b.subarray(0, 4).toString() === '%PDF') ||
    (req.file.mimetype === 'image/png' && b[0] === 0x89 && b[1] === 0x50) ||
    (req.file.mimetype === 'image/jpeg' && b[0] === 0xff && b[1] === 0xd8);
  next(ok ? undefined : ApiError.badRequest('File contents do not match its type'));
}

module.exports = { resumeUpload, logoUpload, checkMagicBytes };
