const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const BCRYPT_COST = 10;

/** @param {import('mongoose').Document} user */
function signAccess(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.jwtAccessSecret, {
    expiresIn: env.accessTtl,
  });
}

/** @param {import('mongoose').Document & {tokenVersion: number}} user */
function signRefresh(user) {
  return jwt.sign({ sub: user.id, v: user.tokenVersion }, env.jwtRefreshSecret, {
    expiresIn: `${env.refreshTtlDays}d`,
  });
}

/** Creates a seeker or recruiter account. Emails are unique, compared lowercase. */
async function register({ name, email, password, role }) {
  if (await User.exists({ email })) {
    throw ApiError.conflict('EMAIL_TAKEN', 'An account with this email already exists');
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ name, email, passwordHash, role });
  return issue(user);
}

/** Verifies credentials. The same message is used for unknown email and wrong password. */
async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +tokenVersion');
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  if (user.isBlocked) throw ApiError.forbidden('This account has been blocked');
  return issue(user);
}

/** Exchanges a valid refresh token for a new access token and a rotated refresh token. */
async function refresh(token) {
  if (!token) throw ApiError.unauthorized('No session to refresh');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired');
  }
  const user = await User.findById(payload.sub).select('+tokenVersion');
  if (!user || user.tokenVersion !== payload.v)
    throw ApiError.unauthorized('Your session has expired');
  if (user.isBlocked) throw ApiError.forbidden('This account has been blocked');
  return issue(user);
}

/** Invalidates every refresh token issued to the user. */
async function revokeAll(userId) {
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

async function issue(user) {
  if (user.tokenVersion === undefined) {
    const withVersion = await User.findById(user.id).select('+tokenVersion');
    user.tokenVersion = withVersion.tokenVersion;
  }
  return { user, accessToken: signAccess(user), refreshToken: signRefresh(user) };
}

module.exports = { register, login, refresh, revokeAll, BCRYPT_COST };
