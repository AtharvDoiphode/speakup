// Passes errors from async route handlers to the error handler.
// Express 5 already does this by itself, so this is only needed if you
// ever move back to Express 4. Kept here so older tutorials' code still works.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
