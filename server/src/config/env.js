require('dotenv').config();

const isTest = process.env.NODE_ENV === 'test';

/** Typed, defaulted view of process.env. Fails fast on missing secrets outside tests. */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/hire-the-fire',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || (isTest ? 'test-access' : ''),
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || (isTest ? 'test-refresh' : ''),
  accessTtl: '15m',
  refreshTtlDays: 7,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM || 'Hire the Fire <no-reply@hirethefire.dev>',
  },
};

if (!env.jwtAccessSecret || !env.jwtRefreshSecret) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set (see server/.env.example)');
}

module.exports = env;
