/** Wraps an async route handler so rejected promises reach the error middleware. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Sends the standard success shape: { success, data, message }. */
const send = (res, data, { status = 200, message = 'OK' } = {}) =>
  res.status(status).json({ success: true, data, message });

module.exports = { asyncHandler, send };
