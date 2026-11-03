const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const env = require('../config/env');
const v = require('../validators');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { resumeUpload, logoUpload, checkMagicBytes } = require('../middleware/upload');
const authC = require('../controllers/auth.controller');
const c = require('../controllers/resource.controller');

const router = express.Router();
const seeker = [authenticate, authorize('seeker')];
const recruiter = [authenticate, authorize('recruiter', 'admin')];
const admin = [authenticate, authorize('admin')];
const id = validate({ params: v.idParam });

/** Attaches req.user when a valid token is sent, without requiring one (drafts are owner-only). */
const optionalAuth = (req, res, next) =>
  req.get('Authorization') ? authenticate(req, res, next) : next();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.isTest ? 1000 : 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) =>
    res
      .status(429)
      .json({
        success: false,
        error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
      }),
});

/**
 * @openapi
 * /health:
 *   get: { tags: [System], summary: Liveness check, responses: { 200: { description: OK } } }
 */
router.get('/health', (_req, res) =>
  res.json({ success: true, data: { status: 'ok', uptime: process.uptime() }, message: 'OK' }),
);

// ---- auth ----
/**
 * @openapi
 * /auth/register:
 *   post: { tags: [Auth], summary: Create a seeker or recruiter account, responses: { 201: { description: Created }, 400: { description: Validation error }, 409: { description: Email taken } } }
 * /auth/login:
 *   post: { tags: [Auth], summary: Return an access token and set the refresh cookie, responses: { 200: { description: OK }, 401: { description: Wrong credentials } } }
 * /auth/refresh:
 *   post: { tags: [Auth], summary: Issue a new access token from the refresh cookie, responses: { 200: { description: OK }, 401: { description: No or stale session } } }
 * /auth/logout:
 *   post: { tags: [Auth], summary: Clear the refresh cookie (everywhere=true revokes all sessions), security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 */
router.post('/auth/register', authLimiter, validate({ body: v.register }), authC.register);
router.post('/auth/login', authLimiter, validate({ body: v.login }), authC.login);
router.post('/auth/refresh', authLimiter, authC.refresh);
router.post('/auth/logout', authenticate, authC.logout);

// ---- users ----
/**
 * @openapi
 * /users/me:
 *   get: { tags: [Users], summary: Current user and profile, security: [{ bearer: [] }], responses: { 200: { description: OK }, 401: { description: Not logged in } } }
 *   patch: { tags: [Users], summary: Update profile, security: [{ bearer: [] }], responses: { 200: { description: OK }, 400: { description: Validation error } } }
 * /users/me/resume:
 *   post: { tags: [Users], summary: Upload resume PDF (max 2 MB, field "resume"), security: [{ bearer: [] }], responses: { 201: { description: Uploaded }, 400: { description: Wrong type or too large } } }
 * /users/me/saved:
 *   get: { tags: [Users], summary: Saved jobs, security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /users/me/saved/{jobId}:
 *   post: { tags: [Users], summary: Save a job, security: [{ bearer: [] }], parameters: [{ in: path, name: jobId, required: true, schema: { type: string } }], responses: { 201: { description: Saved } } }
 *   delete: { tags: [Users], summary: Unsave a job, security: [{ bearer: [] }], parameters: [{ in: path, name: jobId, required: true, schema: { type: string } }], responses: { 200: { description: Removed } } }
 */
router.get('/users/me', authenticate, c.me);
router.patch('/users/me', authenticate, validate({ body: v.updateProfile }), c.updateMe);
router.post('/users/me/resume', seeker, resumeUpload, checkMagicBytes, c.uploadResume);
router.get('/users/me/saved', seeker, c.listSaved);
router.post('/users/me/saved/:jobId', seeker, validate({ params: v.savedParam }), c.saveJob);
router.delete('/users/me/saved/:jobId', seeker, validate({ params: v.savedParam }), c.unsaveJob);

// ---- jobs ----
/**
 * @openapi
 * /jobs:
 *   get:
 *     tags: [Jobs]
 *     summary: Search, filter, sort and paginate open jobs
 *     parameters:
 *       - { in: query, name: q, schema: { type: string } }
 *       - { in: query, name: location, schema: { type: string } }
 *       - { in: query, name: jobType, schema: { type: string, enum: [full-time, internship, contract] } }
 *       - { in: query, name: remote, schema: { type: boolean } }
 *       - { in: query, name: experience, schema: { type: number }, description: Years of experience the seeker has }
 *       - { in: query, name: salaryMin, schema: { type: number }, description: INR per year }
 *       - { in: query, name: salaryMax, schema: { type: number } }
 *       - { in: query, name: sort, schema: { type: string, enum: [-createdAt, createdAt, -salaryMax, salaryMin, relevance] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, maximum: 50 } }
 *     responses: { 200: { description: "{ items, page, limit, total, pages }" } }
 *   post: { tags: [Jobs], summary: Create a job (recruiter), security: [{ bearer: [] }], responses: { 201: { description: Created }, 400: { description: Validation error or no company }, 403: { description: Not a recruiter } } }
 * /jobs/recommended:
 *   get: { tags: [Jobs], summary: Open jobs ranked by skill match (seeker), security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /jobs/{id}:
 *   get: { tags: [Jobs], summary: Job detail, parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 404: { description: Not found } } }
 *   patch: { tags: [Jobs], summary: Edit a job (owner), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 403: { description: Not the owner } } }
 *   delete: { tags: [Jobs], summary: Remove a job (owner or admin), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 403: { description: Not the owner } } }
 * /jobs/{id}/status:
 *   patch: { tags: [Jobs], summary: Open, close or reopen (owner), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 * /jobs/{id}/apply:
 *   post: { tags: [Applications], summary: Apply with the saved resume (seeker), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 201: { description: Applied }, 400: { description: Job closed or no resume }, 409: { description: Already applied } } }
 * /jobs/{id}/applications:
 *   get: { tags: [Applications], summary: Applicants for one job (owner), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }, { in: query, name: status, schema: { type: string } }], responses: { 200: { description: OK }, 403: { description: Not the owner } } }
 */
router.get('/jobs', validate({ query: v.jobQuery }), c.searchJobs);
router.get('/jobs/recommended', seeker, c.recommended);
router.post('/jobs', recruiter, validate({ body: v.createJob }), c.createJob);
router.get('/jobs/:id', id, optionalAuth, c.getJob);
router.patch('/jobs/:id', recruiter, id, validate({ body: v.updateJob }), c.updateJob);
router.patch('/jobs/:id/status', recruiter, id, validate({ body: v.jobStatus }), c.setJobStatus);
router.delete('/jobs/:id', recruiter, id, c.deleteJob);
router.post('/jobs/:id/apply', seeker, id, validate({ body: v.apply }), c.apply);
router.get(
  '/jobs/:id/applications',
  recruiter,
  id,
  validate({ query: v.applicantsQuery }),
  c.jobApplicants,
);

// ---- applications ----
/**
 * @openapi
 * /applications/me:
 *   get: { tags: [Applications], summary: My applications with status and history (seeker), security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /applications/{id}/withdraw:
 *   patch: { tags: [Applications], summary: Withdraw (owner seeker), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 400: { description: Not withdrawable }, 403: { description: Not yours } } }
 * /applications/{id}/status:
 *   patch: { tags: [Applications], summary: Move an applicant; writes history and emails the seeker, security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK }, 400: { description: Invalid move }, 403: { description: Not the owner } } }
 * /applications/{id}/notes:
 *   patch: { tags: [Applications], summary: Private recruiter notes, security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 */
router.get('/applications/me', seeker, c.myApplications);
router.patch('/applications/:id/withdraw', seeker, id, c.withdraw);
router.patch(
  '/applications/:id/status',
  recruiter,
  id,
  validate({ body: v.applicationStatus }),
  c.moveApplication,
);
router.patch('/applications/:id/notes', recruiter, id, validate({ body: v.notes }), c.setNotes);

// ---- recruiter ----
/**
 * @openapi
 * /recruiter/jobs:
 *   get: { tags: [Recruiter], summary: The recruiter's jobs with applicant counts per status, security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /recruiter/stats:
 *   get: { tags: [Recruiter], summary: Dashboard numbers from aggregation, security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /companies:
 *   post: { tags: [Companies], summary: Create the company profile, security: [{ bearer: [] }], responses: { 201: { description: Created }, 409: { description: Already has one } } }
 * /companies/{id}:
 *   patch: { tags: [Companies], summary: Edit the company profile (owner), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 * /companies/{id}/logo:
 *   post: { tags: [Companies], summary: Upload a PNG or JPEG logo (field "logo"), security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 201: { description: Uploaded } } }
 */
router.get('/recruiter/jobs', recruiter, c.recruiterJobs);
router.get('/recruiter/stats', recruiter, c.recruiterStats);
router.post('/companies', recruiter, validate({ body: v.company }), c.createCompany);
router.patch(
  '/companies/:id',
  recruiter,
  id,
  validate({ body: v.company.partial() }),
  c.updateCompany,
);
router.post('/companies/:id/logo', recruiter, id, logoUpload, checkMagicBytes, c.uploadLogo);

// ---- admin ----
const page = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['seeker', 'recruiter', 'admin']).optional(),
  q: z.string().trim().max(80).optional(),
});
/**
 * @openapi
 * /admin/users:
 *   get: { tags: [Admin], summary: List users, security: [{ bearer: [] }], responses: { 200: { description: OK }, 403: { description: Not an admin } } }
 * /admin/users/{id}/block:
 *   patch: { tags: [Admin], summary: Block or unblock a user, security: [{ bearer: [] }], parameters: [{ in: path, name: id, required: true, schema: { type: string } }], responses: { 200: { description: OK } } }
 * /admin/jobs:
 *   get: { tags: [Admin], summary: List all jobs, security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 * /admin/stats:
 *   get: { tags: [Admin], summary: Platform totals, security: [{ bearer: [] }], responses: { 200: { description: OK } } }
 */
router.get('/admin/users', admin, validate({ query: page }), c.adminUsers);
router.patch(
  '/admin/users/:id/block',
  admin,
  id,
  validate({ body: z.object({ blocked: z.boolean() }) }),
  c.blockUser,
);
router.get('/admin/jobs', admin, validate({ query: page }), c.adminJobs);
router.get('/admin/stats', admin, c.platformStats);

module.exports = router;
