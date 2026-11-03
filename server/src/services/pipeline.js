/**
 * Pure rules for moving applications and ranking jobs. No database access, so they are unit-tested directly.
 */

/** Allowed recruiter moves from each status. Rejected and hired are final; withdrawn is the seeker's move. */
const TRANSITIONS = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected', 'applied'],
  interview: ['hired', 'rejected', 'shortlisted'],
  rejected: [],
  hired: [],
  withdrawn: [],
};

/** Statuses a seeker may withdraw from. */
const WITHDRAWABLE = ['applied', 'shortlisted', 'interview'];

/**
 * @param {string} from current status
 * @param {string} to requested status
 * @returns {boolean}
 */
function canMove(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

/** @param {string} status */
function canWithdraw(status) {
  return WITHDRAWABLE.includes(status);
}

/**
 * Number of a job's skills the seeker has, case-insensitive.
 * @param {string[]} seekerSkills
 * @param {string[]} jobSkills
 * @returns {{matched: number, total: number, skills: string[]}}
 */
function skillMatch(seekerSkills = [], jobSkills = []) {
  const have = new Set(seekerSkills.map((s) => s.toLowerCase()));
  const skills = jobSkills.filter((s) => have.has(s.toLowerCase()));
  return { matched: skills.length, total: jobSkills.length, skills };
}

/**
 * Builds the Mongo filter for the public job search from validated query params.
 * @param {object} q validated jobQuery
 */
function buildJobFilter(q) {
  const filter = { status: 'open' };
  if (q.q) filter.$text = { $search: q.q };
  if (q.location) filter.location = { $regex: escapeRegex(q.location), $options: 'i' };
  if (q.jobType) filter.jobType = q.jobType;
  if (typeof q.remote === 'boolean') filter.remote = q.remote;
  if (typeof q.experience === 'number') {
    filter.experienceMin = { $lte: q.experience };
    filter.$or = [{ experienceMax: { $gte: q.experience } }, { experienceMax: 0 }];
  }
  // Salary filters overlap ranges: a job paying 8-12 LPA matches "at least 10 LPA".
  if (typeof q.salaryMin === 'number') filter.salaryMax = { $gte: q.salaryMin };
  if (typeof q.salaryMax === 'number') filter.salaryMin = { $lte: q.salaryMax };
  return filter;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { TRANSITIONS, canMove, canWithdraw, skillMatch, buildJobFilter, escapeRegex };
