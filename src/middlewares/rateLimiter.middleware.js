/**
 * Rate Limiter Middleware (Disabled / Unrestricted)
 * Pass-through middleware allowing unlimited API requests.
 */
export const rateLimiter = (req, res, next) => {
  next();
};

