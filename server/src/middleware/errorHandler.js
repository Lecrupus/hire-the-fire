const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const env = require('../config/env');

function notFound(req, _res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No route for ${req.method} ${req.originalUrl}`));
}

/** Maps any thrown error to { success: false, error: { code, message, details } }. */
function errorHandler(err, req, res, _next) {
  let error = err;

  if (err instanceof mongoose.Error.CastError) {
    error = ApiError.notFound(err.path === '_id' ? 'Record' : err.path);
  } else if (err instanceof mongoose.Error.ValidationError) {
    error = ApiError.badRequest(
      'Invalid data',
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    );
  } else if (err && err.code === 11000) {
    error = ApiError.conflict('DUPLICATE', 'That record already exists');
  } else if (err && err.name === 'MulterError') {
    error = ApiError.badRequest(
      err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than 2 MB' : err.message,
    );
  } else if (err && err.type === 'entity.parse.failed') {
    error = ApiError.badRequest('Request body is not valid JSON');
  } else if (!(err instanceof ApiError)) {
    error = new ApiError(500, 'INTERNAL', 'Something went wrong on our side');
  }

  if (error.status >= 500) {
    logger.error(err.message, { requestId: req.id, stack: err.stack, path: req.originalUrl });
  }

  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) body.error.details = error.details;
  if (!env.isProd && error.status >= 500) body.error.stack = err.stack;
  res.status(error.status).json(body);
}

module.exports = { notFound, errorHandler };
