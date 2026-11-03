const { z } = require('zod');

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
const idParam = z.object({ id: objectId });
const trimmed = (max) => z.string().trim().max(max);
const skills = z
  .array(z.string().trim().min(1).max(40))
  .max(30)
  .transform((list) => [...new Set(list.map((s) => s.toLowerCase()))]);
const url = z.union([
  z.literal(''),
  z.string().trim().url('Enter a full URL, starting with https://'),
]);

// ---- auth ----
const register = z.object({
  name: trimmed(80).min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[a-zA-Z]/, 'Password needs at least one letter')
    .regex(/\d/, 'Password needs at least one number'),
  role: z.enum(['seeker', 'recruiter'], { message: 'Choose seeker or recruiter' }),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

// ---- users ----
const updateProfile = z.object({
  name: trimmed(80).min(2).optional(),
  profile: z
    .object({
      headline: trimmed(120),
      location: trimmed(80),
      experienceYears: z.coerce.number().min(0).max(50),
      skills,
      education: z
        .array(
          z.object({
            school: trimmed(120),
            degree: trimmed(80).optional(),
            field: trimmed(80).optional(),
            startYear: z.coerce.number().int().min(1950).max(2100).optional(),
            endYear: z.coerce.number().int().min(1950).max(2100).optional(),
          }),
        )
        .max(10),
      experience: z
        .array(
          z.object({
            company: trimmed(120),
            title: trimmed(120),
            startDate: trimmed(20).optional(),
            endDate: trimmed(20).optional(),
            description: trimmed(1000).optional(),
          }),
        )
        .max(15),
      links: z.object({ linkedin: url, github: url, portfolio: url }).partial(),
    })
    .partial()
    .optional(),
});

// ---- companies ----
const company = z.object({
  name: trimmed(100).min(2, 'Company name must be at least 2 characters'),
  website: url.optional(),
  about: trimmed(2000).optional(),
  location: trimmed(80).optional(),
});

// ---- jobs ----
const jobFields = {
  title: trimmed(120).min(3, 'Title must be at least 3 characters'),
  description: trimmed(8000).min(30, 'Description must be at least 30 characters'),
  location: trimmed(80).default(''),
  jobType: z.enum(['full-time', 'internship', 'contract']).default('full-time'),
  remote: z.boolean().default(false),
  experienceMin: z.coerce.number().min(0).max(50).default(0),
  experienceMax: z.coerce.number().min(0).max(50).default(0),
  salaryMin: z.coerce.number().min(0).max(100_000_000).default(0),
  salaryMax: z.coerce.number().min(0).max(100_000_000).default(0),
  skills: skills.default([]),
  status: z.enum(['draft', 'open']).default('draft'),
};

const rangesOk = (j) =>
  (j.experienceMax === undefined ||
    j.experienceMin === undefined ||
    j.experienceMax === 0 ||
    j.experienceMax >= j.experienceMin) &&
  (j.salaryMax === undefined ||
    j.salaryMin === undefined ||
    j.salaryMax === 0 ||
    j.salaryMax >= j.salaryMin);
const rangeMessage = { message: 'Maximum must be greater than or equal to minimum' };

const createJob = z.object(jobFields).refine(rangesOk, rangeMessage);
const updateJob = z
  .object(
    Object.fromEntries(
      Object.entries(jobFields).map(([k, v]) => [
        k,
        v instanceof z.ZodDefault ? v.removeDefault().optional() : v.optional(),
      ]),
    ),
  )
  .omit({ status: true })
  .refine(rangesOk, rangeMessage);
const jobStatus = z.object({ status: z.enum(['open', 'closed']) });

const boolString = z
  .enum(['true', 'false'])
  .transform((v) => v === 'true')
  .optional();

const jobQuery = z.object({
  q: trimmed(100).optional(),
  location: trimmed(80).optional(),
  jobType: z.enum(['full-time', 'internship', 'contract']).optional(),
  remote: boolString,
  experience: z.coerce.number().min(0).max(50).optional(),
  salaryMin: z.coerce.number().min(0).optional(),
  salaryMax: z.coerce.number().min(0).optional(),
  sort: z
    .enum(['-createdAt', 'createdAt', '-salaryMax', 'salaryMin', 'relevance'])
    .default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

// ---- applications ----
const apply = z.object({ coverNote: trimmed(2000).optional().default('') });
const applicationStatus = z.object({
  status: z.enum(['shortlisted', 'interview', 'rejected', 'hired', 'applied']),
});
const notes = z.object({ notes: trimmed(5000) });
const applicantsQuery = z.object({
  status: z
    .enum(['applied', 'shortlisted', 'interview', 'rejected', 'hired', 'withdrawn'])
    .optional(),
});

const savedParam = z.object({ jobId: objectId });

module.exports = {
  objectId,
  idParam,
  register,
  login,
  updateProfile,
  company,
  createJob,
  updateJob,
  jobStatus,
  jobQuery,
  apply,
  applicationStatus,
  notes,
  applicantsQuery,
  savedParam,
};
