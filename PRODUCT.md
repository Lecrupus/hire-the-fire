# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

MERN monorepo, as set by the build spec: React 18 + Vite + React Router 6 + Axios in `client/`, plain CSS with CSS Modules (no UI kit); Node 20 + Express 4 + MongoDB (Mongoose) in `server/`. Confirmed by the user: MongoDB, not the optional PostgreSQL swap. Deploy targets: Vercel (client), Render (server), MongoDB Atlas, Cloudinary.

## Users

- **Recruiters** (lead role for design): post jobs for their company and move applicants through a hiring pipeline (Applied, Shortlisted, Interview, Rejected, Hired). They return daily to triage new applicants.
- **Job seekers**: search open jobs, apply with a saved resume, and track each application's status.
- **Admin**: moderates users and jobs and watches platform totals.
- **Evaluators**: the project is a portfolio piece for an SDE I role; reviewers try it using seeded demo logins for each role.

## Product Purpose

Hire the Fire is a job portal that connects seekers and recruiters and gives recruiters a pipeline to run hiring. Success: a seeker can find and apply to a job in a few clicks and see its live status; a recruiter can see at a glance where every applicant stands and move them on.

## Positioning

A small, production-style portal whose strength is the recruiter pipeline: an auditable status history per application, duplicate applications blocked at the database, and recruiter analytics from aggregation.

## Operating Context

- Market: India. Salaries in INR per year; example locations such as Mumbai.
- Recruiters work on desktop; seekers often on mobile (layouts must hold down to 360 px).
- Reviewers arrive cold and log in with demo accounts from the seed script.

## Capabilities and Constraints

- Roles: seeker, recruiter, admin. Role chosen at sign-up (seeker or recruiter).
- Application statuses: applied, shortlisted, interview, rejected, hired, withdrawn. Every move is recorded in a history.
- Job statuses: draft, open, closed. Job types: full-time, internship, contract; remote flag.
- Resumes are PDF, logos PNG/JPEG, max 2 MB.
- Every data view has loading, empty and error states.

## Brand Commitments

- Name: Hire the Fire.
- Voice (confirmed): plain and professional, with a little wit; occasional nods to the name in headings and empty states, never in error messages or anything a user must act on.

## Evidence on Hand

None yet. No real companies, users, testimonials or metrics exist; all content comes from the seed script and must be presented as demo data.

## Product Principles

1. The recruiter's next action is always the most visible thing on the screen.
2. Status is never ambiguous: every application shows where it stands and how it got there.
3. Fast to scan over fast to impress: dense, consistent views for daily use.
4. Honest demo: seeded data is labeled as demo, never passed off as real.

## Accessibility & Inclusion

Semantic HTML and accessible forms are a spec requirement; target a passing Lighthouse accessibility score and WCAG AA contrast.
