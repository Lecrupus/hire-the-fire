const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/asyncHandler');

/** Reads the Bearer access token, verifies it and attaches req.user. Blocked users get 403. */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get('Authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, env.jwtAccessSecret);
  } catch {
    throw new ApiError(401, 'TOKEN_EXPIRED', 'Your session has expired');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized();
  if (user.isBlocked) throw ApiError.forbidden('This account has been blocked');
  req.user = user;
  next();
});

/** Rejects with 403 unless req.user has one of the given roles. Use after authenticate. */
const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Only ${roles.join(' or ')} accounts can do this`));
    }
    next();
  };

module.exports = { authenticate, authorize };
