import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(StatusCodes.NOT_FOUND, `Route not found - ${req.originalUrl}`));
};
