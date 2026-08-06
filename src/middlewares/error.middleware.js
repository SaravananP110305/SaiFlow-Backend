import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';
import { MAX_AVATAR_SIZE } from './upload.middleware.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  const shouldExposeStack = env.isDevelopment && !env.isProduction;

  // Handle multer upload errors (file too large, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = StatusCodes.REQUEST_TOO_LARGE;
      message = `File is too large. Maximum allowed size is ${Math.round(MAX_AVATAR_SIZE / (1024 * 1024))} MB.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = StatusCodes.BAD_REQUEST;
      message = 'Unexpected file field. Please upload a single image under the "photo" field.';
    } else {
      statusCode = StatusCodes.BAD_REQUEST;
      message = `Upload failed: ${err.message}`;
    }
  } else if (!(err instanceof ApiError)) {
    if (err?.code === 'P2002') {
      statusCode = StatusCodes.CONFLICT;
      message = 'A record with the same unique value already exists.';
    } else {
      statusCode = statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
      message = message || err.message || 'Internal Server Error';
    }
  }

  const response = {
    success: false,
    statusCode,
    message,
    ...(shouldExposeStack && { stack: err.stack })
  };

  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error(`[Express Error Handler] ${err.stack || err.message}`);
  } else {
    logger.warn(`[Client Error] ${statusCode} - ${message} (Path: ${req.originalUrl})`);
  }

  res.status(statusCode).json(response);
};
