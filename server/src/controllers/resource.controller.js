const users = require('../services/user.service');
const jobs = require('../services/job.service');
const applications = require('../services/application.service');
const companies = require('../services/company.service');
const stats = require('../services/stats.service');
const admin = require('../services/admin.service');
const { asyncHandler, send } = require('../utils/asyncHandler');

// ---- users ----
exports.me = asyncHandler(async (req, res) => send(res, await users.me(req.user._id)));
exports.updateMe = asyncHandler(async (req, res) =>
  send(res, await users.updateProfile(req.user, req.body), { message: 'Profile saved' }),
);
exports.uploadResume = asyncHandler(async (req, res) =>
  send(res, await users.uploadResume(req.user, req.file), {
    status: 201,
    message: 'Resume uploaded',
  }),
);
exports.saveJob = asyncHandler(async (req, res) => {
  await users.saveJob(req.user, req.params.jobId);
  send(res, null, { status: 201, message: 'Job saved' });
});
exports.unsaveJob = asyncHandler(async (req, res) => {
  await users.unsaveJob(req.user, req.params.jobId);
  send(res, null, { message: 'Job removed from saved' });
});
exports.listSaved = asyncHandler(async (req, res) => send(res, await users.listSaved(req.user)));

// ---- jobs ----
exports.searchJobs = asyncHandler(async (req, res) => send(res, await jobs.search(req.query)));
exports.getJob = asyncHandler(async (req, res) =>
  send(res, await jobs.getById(req.params.id, req.user)),
);
exports.recommended = asyncHandler(async (req, res) => send(res, await jobs.recommended(req.user)));
exports.createJob = asyncHandler(async (req, res) =>
  send(res, await jobs.create(req.body, req.user), { status: 201, message: 'Job created' }),
);
exports.updateJob = asyncHandler(async (req, res) =>
  send(res, await jobs.update(req.params.id, req.body, req.user), { message: 'Job updated' }),
);
exports.setJobStatus = asyncHandler(async (req, res) =>
  send(res, await jobs.setStatus(req.params.id, req.body.status, req.user), {
    message: `Job ${req.body.status}`,
  }),
);
exports.deleteJob = asyncHandler(async (req, res) => {
  await jobs.remove(req.params.id, req.user);
  send(res, null, { message: 'Job removed' });
});
exports.recruiterJobs = asyncHandler(async (req, res) =>
  send(res, await jobs.listForRecruiter(req.user)),
);

// ---- applications ----
exports.apply = asyncHandler(async (req, res) =>
  send(res, await applications.apply(req.params.id, req.user, req.body), {
    status: 201,
    message: 'Application sent',
  }),
);
exports.myApplications = asyncHandler(async (req, res) =>
  send(res, await applications.listMine(req.user)),
);
exports.withdraw = asyncHandler(async (req, res) =>
  send(res, await applications.withdraw(req.params.id, req.user), {
    message: 'Application withdrawn',
  }),
);
exports.jobApplicants = asyncHandler(async (req, res) =>
  send(res, await applications.listForJob(req.params.id, req.user, req.query)),
);
exports.moveApplication = asyncHandler(async (req, res) =>
  send(res, await applications.move(req.params.id, req.body.status, req.user), {
    message: 'Status updated',
  }),
);
exports.setNotes = asyncHandler(async (req, res) =>
  send(res, await applications.setNotes(req.params.id, req.body.notes, req.user), {
    message: 'Notes saved',
  }),
);

// ---- companies ----
exports.createCompany = asyncHandler(async (req, res) =>
  send(res, await companies.create(req.body, req.user), {
    status: 201,
    message: 'Company created',
  }),
);
exports.updateCompany = asyncHandler(async (req, res) =>
  send(res, await companies.update(req.params.id, req.body, req.user), {
    message: 'Company saved',
  }),
);
exports.uploadLogo = asyncHandler(async (req, res) =>
  send(res, await companies.uploadLogo(req.params.id, req.file, req.user), {
    status: 201,
    message: 'Logo uploaded',
  }),
);

// ---- stats and admin ----
exports.recruiterStats = asyncHandler(async (req, res) =>
  send(res, await stats.recruiterStats(req.user)),
);
exports.platformStats = asyncHandler(async (_req, res) => send(res, await stats.platformStats()));
exports.adminUsers = asyncHandler(async (req, res) => send(res, await admin.listUsers(req.query)));
exports.adminJobs = asyncHandler(async (req, res) => send(res, await admin.listJobs(req.query)));
exports.blockUser = asyncHandler(async (req, res) => {
  const user = await admin.setBlocked(req.params.id, req.body.blocked, req.user);
  send(res, user, { message: user.isBlocked ? 'User blocked' : 'User unblocked' });
});
