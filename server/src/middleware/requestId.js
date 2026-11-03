const crypto = require('crypto');

/** Gives every request an X-Request-Id (reusing the caller's if sent) so its log lines can be traced. */
function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
