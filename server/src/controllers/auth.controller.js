const env = require('../config/env');
const auth = require('../services/auth.service');
const { asyncHandler, send } = require('../utils/asyncHandler');

const COOKIE = 'htf_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.isProd,
  // The client and API live on different domains in production (Vercel + Render).
  sameSite: env.isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: env.refreshTtlDays * 24 * 60 * 60 * 1000,
};

function respondWithSession(res, { user, accessToken, refreshToken }, status, message) {
  res.cookie(COOKIE, refreshToken, cookieOptions);
  return send(res, { user, accessToken }, { status, message });
}

exports.register = asyncHandler(async (req, res) =>
  respondWithSession(res, await auth.register(req.body), 201, 'Account created'),
);

exports.login = asyncHandler(async (req, res) =>
  respondWithSession(res, await auth.login(req.body), 200, 'Logged in'),
);

exports.refresh = asyncHandler(async (req, res) =>
  respondWithSession(res, await auth.refresh(req.cookies?.[COOKIE]), 200, 'Session refreshed'),
);

exports.logout = asyncHandler(async (req, res) => {
  if (req.query.everywhere === 'true') await auth.revokeAll(req.user._id);
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  send(res, null, { message: 'Logged out' });
});

exports.COOKIE = COOKIE;
