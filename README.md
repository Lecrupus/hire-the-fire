# Hire the Fire

A full-stack MERN job portal. Job seekers search and apply in one click, then watch every status
change land as a dated postmark. Recruiters post jobs and move applicants through a pipeline. An
admin moderates users and jobs.

Live demo: _not deployed yet_

## Features

| Role       | What they can do                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Everyone   | Search jobs by keyword (title, skills, company), filter by city, type, experience, salary and remote; sort; paginate. Filters live in the URL.                                                                                          |
| Job seeker | Profile with skills, education, experience and a PDF resume; apply with an optional note (duplicates blocked by a unique index); track status with full history; withdraw; save jobs; recommended jobs by skill match.                  |
| Recruiter  | Company profile and logo; create, edit, publish, close and reopen jobs; per-job pipeline with skill match, private notes and an audit trail of every move; dashboard built from MongoDB aggregations; seekers are emailed on each move. |
| Admin      | Platform totals; block and unblock users (ends their sessions); remove jobs.                                                                                                                                                            |

## Tech stack

React 18 + Vite, React Router 6, Axios, CSS Modules · Node 20 + Express 4 · MongoDB + Mongoose ·
JWT access token (15 min) + httpOnly refresh cookie (7 days), bcrypt · Zod validation · Multer +
Cloudinary uploads · helmet, cors, rate limiting, mongo-sanitize · winston + morgan with request IDs ·
Swagger at `/api/docs` · Jest, Supertest, mongodb-memory-server, Vitest, React Testing Library ·
GitHub Actions.

## Run it locally

Needs Node 20+. No Docker or Atlas account required.

```bash
npm install
cp server/.env.example server/.env   # then set the two JWT secrets
npm run db:local -w server           # local MongoDB on :27017 (leave running)
npm run seed                         # demo data, in a second terminal
npm run dev                          # API on :5000, client on :5173
```

Open http://localhost:5173. To use your own MongoDB instead, set `MONGODB_URI` in `server/.env`
and skip `db:local`.

### Demo logins

All use the password `Demo@1234`. The data is fictional.

| Role      | Email                            |
| --------- | -------------------------------- |
| Seeker    | `seeker@demo.hirethefire.dev`    |
| Recruiter | `recruiter@demo.hirethefire.dev` |
| Admin     | `admin@demo.hirethefire.dev`     |

## Environment variables (`server/.env`)

| Name                                                                   | Required | Notes                                                  |
| ---------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| `MONGODB_URI`                                                          | yes      | e.g. `mongodb://127.0.0.1:27017/hire-the-fire`         |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`                              | yes      | long random strings                                    |
| `CLIENT_URL`                                                           | yes      | allowed CORS origin, e.g. `http://localhost:5173`      |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no       | without them, uploads go to `server/uploads`           |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`        | no       | without them, status emails are logged instead of sent |

The client reads `VITE_API_URL` (the API origin) in production; in development Vite proxies `/api`.

## Tests

```bash
npm test                                # server (Jest + Supertest) and client (Vitest)
npm run test:coverage -w server         # fails under 70% line coverage
```

The API tests run against an in-memory MongoDB and cover auth, role and ownership checks (403),
duplicate applications sent at the same moment (409), closed jobs, invalid status moves,
validation (400) and pagination.

## Project layout

```
client/   React app: api/, components/, context/, hooks/, pages/, styles/
server/   Express API: config/, models/, controllers/, routes/, middleware/, services/, validators/, utils/
          tests/, seed/, scripts/local-db.js
.github/  CI workflow and PR template
```

API documentation is generated from the route comments and served at
http://localhost:5000/api/docs.
