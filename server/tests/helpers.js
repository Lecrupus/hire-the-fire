const request = require('supertest');
const createApp = require('../src/app');
const User = require('../src/models/User');

const app = createApp();
const api = () => request(app);
const PDF = Buffer.from('%PDF-1.4\n% test resume\n');
let n = 0;

/** Registers a user and returns { token, user, cookie }. Admins are promoted after sign-up. */
async function signUp(role = 'seeker', overrides = {}) {
  n += 1;
  const body = {
    name: overrides.name || `${role} ${n}`,
    email: overrides.email || `${role}${n}@test.dev`,
    password: 'Passw0rd!',
    role: role === 'admin' ? 'seeker' : role,
  };
  const res = await api().post('/api/v1/auth/register').send(body).expect(201);
  if (role === 'admin') await User.updateOne({ _id: res.body.data.user._id }, { role: 'admin' });
  return {
    token: res.body.data.accessToken,
    user: res.body.data.user,
    cookie: res.headers['set-cookie'],
    auth: { Authorization: `Bearer ${res.body.data.accessToken}` },
  };
}

/** A recruiter with a company. */
async function recruiterWithCompany(name = 'Kestrel Labs') {
  const r = await signUp('recruiter');
  const res = await api()
    .post('/api/v1/companies')
    .set(r.auth)
    .send({ name, location: 'Bengaluru' })
    .expect(201);
  return { ...r, company: res.body.data };
}

const jobBody = (overrides = {}) => ({
  title: 'Frontend Engineer (React)',
  description: 'Build and ship the web client for our hiring product with a small, fast team.',
  location: 'Bengaluru',
  jobType: 'full-time',
  remote: false,
  experienceMin: 2,
  experienceMax: 4,
  salaryMin: 1200000,
  salaryMax: 1800000,
  skills: ['react', 'typescript', 'css'],
  status: 'open',
  ...overrides,
});

async function postJob(recruiter, overrides) {
  const res = await api()
    .post('/api/v1/jobs')
    .set(recruiter.auth)
    .send(jobBody(overrides))
    .expect(201);
  return res.body.data;
}

/** A seeker with skills and an uploaded resume, ready to apply. */
async function seekerWithResume(skills = ['react', 'css']) {
  const s = await signUp('seeker');
  await api().patch('/api/v1/users/me').set(s.auth).send({ profile: { skills } }).expect(200);
  await api()
    .post('/api/v1/users/me/resume')
    .set(s.auth)
    .attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' })
    .expect(201);
  return s;
}

module.exports = { api, signUp, recruiterWithCompany, postJob, jobBody, seekerWithResume, PDF };
