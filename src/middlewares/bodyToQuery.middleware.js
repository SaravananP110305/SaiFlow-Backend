/**
 * Middleware that copies req.body parameters into req.query for POST retrieval endpoints.
 * This preserves query parsing, database parameters, sorting, and pagination logic on the backend.
 */
export const bodyToQuery = (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    req.query = { ...req.query, ...req.body };
  }
  next();
};
