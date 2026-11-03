const ApiError = require('../utils/ApiError');

/**
 * Validates req.body / req.query / req.params against Zod schemas and replaces them with the parsed values.
 * @param {{body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny}} schemas
 */
const validate = (schemas) => (req, _res, next) => {
  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(ApiError.badRequest(details[0]?.message || 'Invalid input', details));
    }
    // req.query is a getter in Express 5; define it so this also works there.
    Object.defineProperty(req, key, { value: result.data, writable: true, enumerable: true });
  }
  next();
};

module.exports = validate;
