import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError.js';

export const validate = (schema, options = {}) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message.replace(/['"]/g, ''))
        .join(', ');
      return next(new ApiError(StatusCodes.BAD_REQUEST, errorMessage));
    }

    req.body = value;
    next();
  };
};
