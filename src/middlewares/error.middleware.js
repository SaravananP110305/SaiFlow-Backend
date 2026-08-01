import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // If error is not an instance of ApiError, classify it
  if (!(err instanceof ApiError)) {
    statusCode = statusCode || err.status || StatusCodes.INTERNAL_SERVER_ERROR;
    message = message || err.message || 'Internal Server Error';
  }

  const response = {
    success: false,
    statusCode,
    message,
    ...(env.isDevelopment && { stack: err.stack })
  };

  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) {
    logger.error(`[Express Error Handler] ${err.stack || err.message}`);
  } else {
    logger.warn(`[Client Error] ${statusCode} - ${message} (Path: ${req.originalUrl})`);
  }

  res.status(statusCode).json(response);
};
