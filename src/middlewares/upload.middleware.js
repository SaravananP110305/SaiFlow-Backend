import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Uploads root: <project>/uploads (served statically at /uploads)
export const uploadsRoot = path.join(__dirname, '..', '..', 'uploads');
export const avatarsDir = path.join(uploadsRoot, 'avatars');

// Ensure the avatars directory exists
fs.mkdirSync(avatarsDir, { recursive: true });

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
];

// Map accepted MIME types to a safe file extension. The extension is NEVER
// taken from the client-supplied originalname (prevents .php/.html/.js uploads).
const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif'
};

export const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarsDir),
  filename: (req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.img';
    const uniqueName = `avatar-${req.user?.id ?? 'user'}-${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        StatusCodes.BAD_REQUEST,
        'Only image files (JPEG, PNG, WebP, GIF, AVIF) are allowed'
      )
    );
  }
};

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_AVATAR_SIZE,
    files: 1
  }
});
