const Job = require('../models/Job');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const { buildJobFilter, skillMatch } = require('./pipeline');

const PUBLIC_COMPANY_FIELDS = 'name logoUrl website location about';

const SORTS = {
  '-createdAt': { publishedAt: -1, createdAt: -1 },
  createdAt: { publishedAt: 1, createdAt: 1 },
  '-salaryMax': { salaryMax: -1, createdAt: -1 },
  salaryMin: { salaryMin: 1, createdAt: -1 },
};

/**
 * Public search over open jobs with filters, sort and pagination.
 * @param {object} query validated jobQuery
 */
async function search(query) {
  const filter = buildJobFilter(query);
  const useRelevance = query.q && (query.sort === 'relevance' || !query.sort);
  const sort = useRelevance
    ? { score: { $meta: 'textScore' } }
    : SORTS[query.sort] || SORTS['-createdAt'];
  const projection = query.q ? { score: { $meta: 'textScore' } } : {};

  const [items, total] = await Promise.all([
    Job.find(filter, projection)
      .sort(sort)
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .populate('company', 'name logoUrl location')
      .lean(),
    Job.countDocuments(filter),
  ]);
  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    pages: Math.ceil(total / query.limit) || 1,
  };
}

/** Public detail. Drafts and closed jobs are visible only to their owner (closed shows to all, flagged). */
async function getById(id, viewer) {
  const job = await Job.findById(id).populate('company', PUBLIC_COMPANY_FIELDS).lean();
  if (!job) throw ApiError.notFound('Job');
  const isOwner = viewer && String(job.postedBy) === String(viewer._id);
  if (job.status === 'draft' && !isOwner && viewer?.role !== 'admin')
    throw ApiError.notFound('Job');
  return job;
}

/** Open jobs ranked by how many of the seeker's skills they ask for. */
async function recommended(seeker, limit = 10) {
  const mySkills = seeker.profile?.skills || [];
  if (!mySkills.length) return [];
  const jobs = await Job.find({ status: 'open', skills: { $in: mySkills } })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('company', 'name logoUrl location')
    .lean();
  return jobs
    .map((job) => ({ ...job, match: skillMatch(mySkills, job.skills) }))
    .sort(
      (a, b) =>
        b.match.matched - a.match.matched ||
        b.match.matched / b.match.total - a.match.matched / a.match.total,
    )
    .slice(0, limit);
}

/** Loads a job and checks the recruiter owns it (admins pass). */
async function getOwned(id, user) {
  const job = await Job.findById(id);
  if (!job) throw ApiError.notFound('Job');
  if (user.role !== 'admin' && String(job.postedBy) !== String(user._id)) {
    throw ApiError.forbidden('This job belongs to another recruiter');
  }
  return job;
}

/** Creates a job under the recruiter's company. A company profile is required first. */
async function create(data, recruiter) {
  const company = await Company.findOne({ owner: recruiter._id });
  if (!company)
    throw new ApiError(400, 'COMPANY_REQUIRED', 'Create your company profile before posting a job');
  return Job.create({
    ...data,
    company: company._id,
    companyName: company.name,
    postedBy: recruiter._id,
    publishedAt: data.status === 'open' ? new Date() : undefined,
  });
}

async function update(id, data, user) {
  const job = await getOwned(id, user);
  Object.assign(job, data);
  await job.save();
  return job;
}

/** Publishes, closes or reopens a job. */
async function setStatus(id, status, user) {
  const job = await getOwned(id, user);
  if (job.status === status) return job;
  job.status = status;
  if (status === 'open' && !job.publishedAt) job.publishedAt = new Date();
  await job.save();
  return job;
}

async function remove(id, user) {
  const job = await getOwned(id, user);
  const Application = require('../models/Application');
  await Promise.all([Application.deleteMany({ job: job._id }), job.deleteOne()]);
}

/** The recruiter's own jobs, newest first, with live applicant counts per status. */
async function listForRecruiter(recruiter) {
  const Application = require('../models/Application');
  const jobs = await Job.find({ postedBy: recruiter._id }).sort({ createdAt: -1 }).lean();
  const counts = await Application.aggregate([
    { $match: { job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: { job: '$job', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const byJob = {};
  for (const c of counts) {
    const key = String(c._id.job);
    byJob[key] = byJob[key] || {};
    byJob[key][c._id.status] = c.n;
  }
  return jobs.map((j) => ({ ...j, statusCounts: byJob[String(j._id)] || {} }));
}

module.exports = {
  search,
  getById,
  recommended,
  getOwned,
  create,
  update,
  setStatus,
  remove,
  listForRecruiter,
};
