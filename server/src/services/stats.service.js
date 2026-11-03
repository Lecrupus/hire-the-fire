const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');

const DAY = 24 * 60 * 60 * 1000;

/**
 * Recruiter dashboard numbers, all from aggregation pipelines:
 * totals per status across their jobs, per-job counts, and applications per day for the last 30 days.
 */
async function recruiterStats(recruiter, now = new Date()) {
  const jobs = await Job.find({ postedBy: recruiter._id }).select('_id title status').lean();
  const jobIds = jobs.map((j) => j._id);
  const since = new Date(now.getTime() - 29 * DAY);
  since.setUTCHours(0, 0, 0, 0);

  const [byStatus, perDay, recent] = await Promise.all([
    Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { job: { $in: jobIds }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          n: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Application.find({ job: { $in: jobIds } })
      .sort({ lastMovedAt: -1 })
      .limit(8)
      .populate('applicant', 'name')
      .populate('job', 'title')
      .select('status lastMovedAt history applicant job')
      .lean(),
  ]);

  const statusTotals = Object.fromEntries(byStatus.map((s) => [s._id, s.n]));
  const dayMap = Object.fromEntries(perDay.map((d) => [d._id, d.n]));
  const days = [];
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
    days.push({ date: d, count: dayMap[d] || 0 });
  }

  return {
    jobs: { total: jobs.length, open: jobs.filter((j) => j.status === 'open').length },
    applications: {
      total: Object.values(statusTotals).reduce((a, b) => a + b, 0),
      byStatus: statusTotals,
    },
    perDay: days,
    recentMoves: recent,
  };
}

/** Platform totals for the admin panel. */
async function platformStats() {
  const [users, jobs, applications, roles] = await Promise.all([
    User.countDocuments(),
    Job.countDocuments(),
    Application.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
  ]);
  return {
    users,
    jobs,
    applications,
    usersByRole: Object.fromEntries(roles.map((r) => [r._id, r.n])),
  };
}

module.exports = { recruiterStats, platformStats };
