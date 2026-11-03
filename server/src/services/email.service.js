const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../utils/logger');

const LABELS = {
  applied: 'back to Applied',
  shortlisted: 'Shortlisted',
  interview: 'moved to Interview',
  rejected: 'not moving forward',
  hired: 'Hired',
};

let transport;
function getTransport() {
  if (!env.smtp.host) return null;
  transport ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transport;
}

/**
 * Emails a seeker when a recruiter moves their application. Without SMTP settings it logs instead.
 * @param {{status: string, applicant: {name: string, email: string}, job: {title: string, companyName: string}}} app
 */
async function statusChanged(app) {
  const subject = `Your application for ${app.job.title}: ${LABELS[app.status] || app.status}`;
  const text = [
    `Hi ${app.applicant.name},`,
    '',
    `${app.job.companyName} updated your application for ${app.job.title}. It is now: ${LABELS[app.status] || app.status}.`,
    '',
    'See the full history under My applications on Hire the Fire.',
  ].join('\n');

  const t = getTransport();
  if (!t) {
    if (!env.isTest)
      logger.info('Email (SMTP not configured, not sent)', { to: app.applicant.email, subject });
    return;
  }
  try {
    await t.sendMail({ from: env.smtp.from, to: app.applicant.email, subject, text });
  } catch (err) {
    logger.error('Status email failed', { to: app.applicant.email, error: err.message });
  }
}

module.exports = { statusChanged };
