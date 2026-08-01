import { rateLimit } from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next) => {
    next(new ApiError(StatusCodes.TOO_MANY_REQUESTS, 'Too many requests from this IP, please try again after 15 minutes'));
  }
});
