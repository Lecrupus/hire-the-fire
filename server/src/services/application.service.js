const Application = require('../models/Application');
const Job = require('../models/Job');
const ApiError = require('../utils/ApiError');
const { canMove, canWithdraw, skillMatch } = require('./pipeline');
const { getOwned } = require('./job.service');
const email = require('./email.service');

/**
 * Applies the seeker to an open job with their saved resume.
 * The unique {job, applicant} index is the real guard: two simultaneous requests cannot both insert.
 */
async function apply(jobId, seeker, { coverNote }) {
  const job = await Job.findById(jobId);
  if (!job || job.status === 'draft') throw ApiError.notFound('Job');
  if (job.status !== 'open')
    throw new ApiError(400, 'JOB_CLOSED', 'This job is no longer accepting applications');
  if (!seeker.profile?.resumeUrl) {
    throw new ApiError(400, 'RESUME_REQUIRED', 'Upload a resume to your profile before applying');
  }

  let application;
  try {
    application = await Application.create({
      job: job._id,
      applicant: seeker._id,
      resumeUrl: seeker.profile.resumeUrl,
      coverNote,
      status: 'applied',
      history: [{ status: 'applied', changedBy: seeker._id }],
    });
  } catch (err) {
    if (err.code === 11000)
      throw ApiError.conflict('DUPLICATE_APPLICATION', 'You have already applied to this job');
    throw err;
  }
  await Job.updateOne({ _id: job._id }, { $inc: { applicantCount: 1 } });
  return application;
}

/** The seeker's applications, newest first, with job and company. */
async function listMine(seeker) {
  return Application.find({ applicant: seeker._id })
    .sort({ createdAt: -1 })
    .populate({
      path: 'job',
      select: 'title location jobType remote status company companyName',
      populate: { path: 'company', select: 'name logoUrl' },
    })
    .lean();
}

async function withdraw(id, seeker) {
  const app = await Application.findById(id);
  if (!app) throw ApiError.notFound('Application');
  if (String(app.applicant) !== String(seeker._id))
    throw ApiError.forbidden('This application belongs to someone else');
  if (!canWithdraw(app.status)) {
    throw new ApiError(
      400,
      'INVALID_TRANSITION',
      `An application that is ${app.status} cannot be withdrawn`,
    );
  }
  app.status = 'withdrawn';
  app.history.push({ status: 'withdrawn', changedBy: seeker._id });
  app.lastMovedAt = new Date();
  await app.save();
  return app;
}

/** Applicants for one of the recruiter's jobs, most recently moved first, with skill match. */
async function listForJob(jobId, recruiter, { status } = {}) {
  const job = await getOwned(jobId, recruiter);
  const filter = { job: job._id };
  if (status) filter.status = status;
  const apps = await Application.find(filter)
    .select('+recruiterNotes')
    .sort({ lastMovedAt: -1 })
    .populate(
      'applicant',
      'name email profile.headline profile.location profile.skills profile.experienceYears profile.links',
    )
    .lean();
  return apps.map((a) => ({ ...a, match: skillMatch(a.applicant?.profile?.skills, job.skills) }));
}

/** Loads an application and checks the recruiter owns its job. */
async function getOwnedApplication(id, recruiter) {
  const app = await Application.findById(id).select('+recruiterNotes');
  if (!app) throw ApiError.notFound('Application');
  await getOwned(app.job, recruiter);
  return app;
}

/** Moves an applicant one step, records it in history and emails the seeker. */
async function move(id, to, recruiter) {
  const app = await getOwnedApplication(id, recruiter);
  if (!canMove(app.status, to)) {
    throw new ApiError(
      400,
      'INVALID_TRANSITION',
      `Cannot move an application from ${app.status} to ${to}`,
    );
  }
  app.status = to;
  app.history.push({ status: to, changedBy: recruiter._id });
  app.lastMovedAt = new Date();
  await app.save();

  const populated = await app.populate([
    { path: 'applicant', select: 'name email' },
    { path: 'job', select: 'title companyName' },
  ]);
  email.statusChanged(populated).catch(() => {}); // never block a move on email delivery
  return populated;
}

async function setNotes(id, notes, recruiter) {
  const app = await getOwnedApplication(id, recruiter);
  app.recruiterNotes = notes;
  await app.save();
  return { _id: app._id, recruiterNotes: app.recruiterNotes };
}

module.exports = { apply, listMine, withdraw, listForJob, move, setNotes };
