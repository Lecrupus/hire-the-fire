/** Formatting helpers shared by pages. Salaries are INR per year. */

/** 1250000 -> "12.5 LPA" (lakh per annum, how Indian job ads state pay). */
export function lpa(n) {
  if (!n) return null;
  const v = n / 100000;
  return `${Number.isInteger(v) ? v : v.toFixed(1)} LPA`;
}

export function salaryRange(min, max) {
  if (!min && !max) return 'Salary not disclosed';
  if (min && max && min !== max) return `₹${lpa(min).replace(' LPA', '')}–${lpa(max)}`;
  return `₹${lpa(max || min)}`;
}

export function experienceRange(min, max) {
  if (!min && !max) return 'Any experience';
  if (!max) return `${min}+ yrs`;
  if (min === max) return `${min} yrs`;
  return `${min}–${max} yrs`;
}

const short = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' });
const long = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "02 Nov" */
export const dayMonth = (d) => (d ? short.format(new Date(d)) : '');
/** "2 Nov 2026" */
export const fullDate = (d) => (d ? long.format(new Date(d)) : '');

/** "3 days ago", "today" */
export function ago(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  return fullDate(d);
}

/** Short tracking code for a record id: the last six hex characters, uppercased. */
export const trackingCode = (prefix, id) => `${prefix}-${String(id).slice(-6).toUpperCase()}`;

export const JOB_TYPE_LABEL = {
  'full-time': 'Full-time',
  internship: 'Internship',
  contract: 'Contract',
};

export const STATUS_LABEL = {
  applied: 'Applied',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/** Four-letter postmark codes for the status trail. */
export const STATUS_CODE = {
  applied: 'APPL',
  shortlisted: 'SHRT',
  interview: 'INTV',
  hired: 'HIRD',
  rejected: 'RJCT',
  withdrawn: 'WDRN',
};

/** Recruiter moves allowed from each status (mirrors the server rules). */
export const NEXT_MOVES = {
  applied: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'rejected', 'applied'],
  interview: ['hired', 'rejected', 'shortlisted'],
  rejected: [],
  hired: [],
  withdrawn: [],
};
