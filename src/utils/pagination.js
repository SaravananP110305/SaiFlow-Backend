/**
 * Shared helpers for server-side list pagination and sorting, used by the
 * report endpoints. Reports operate over bounded analytical datasets, so the
 * sort + pagination step happens in memory on the server (the client only ever
 * receives the requested page), while search/filter `where` clauses are pushed
 * down to the database by each endpoint.
 */

/**
 * Parses `page` / `limit` query parameters with sane defaults and bounds.
 */
export const getPagination = (query, defaultLimit = 10, maxLimit = 200) => {
  const page = Math.max(parseInt(query.page || '1', 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit || String(defaultLimit), 10) || defaultLimit, 1),
    maxLimit
  );
  return { page, limit };
};

/**
 * Normalizes a sort order query value to 'asc' | 'desc'.
 */
export const getSortOrder = (query, fallback = 'asc') => {
  return query.sortOrder === 'desc' ? 'desc' : query.sortOrder === 'asc' ? 'asc' : fallback;
};

/**
 * Sorts rows in memory using a value getter. Handles numbers, dates and
 * strings; missing values sort last on ascending order.
 */
export const sortRows = (rows, getValue, sortOrder = 'asc') => {
  const dir = sortOrder === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const av = getValue(a);
    const bv = getValue(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    const sa = String(av ?? '').toLowerCase();
    const sb = String(bv ?? '').toLowerCase();
    if (sa < sb) return -dir;
    if (sa > sb) return dir;
    return 0;
  });
};

/**
 * Applies in-memory pagination and returns the page slice plus totals.
 */
export const paginateRows = (rows, page, limit) => {
  const total = rows.length;
  const startIdx = (page - 1) * limit;
  return {
    data: rows.slice(startIdx, startIdx + limit),
    total,
    totalPages: Math.ceil(total / limit) || 1
  };
};
