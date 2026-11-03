const { api, signUp, recruiterWithCompany, postJob, seekerWithResume } = require('./helpers');
const Job = require('../src/models/Job');

describe('applications', () => {
  let recruiter;
  let job;
  let seeker;

  beforeEach(async () => {
    recruiter = await recruiterWithCompany();
    job = await postJob(recruiter);
    seeker = await seekerWithResume(['react', 'css']);
  });

  const apply = (s = seeker, j = job) =>
    api().post(`/api/v1/jobs/${j._id}/apply`).set(s.auth).send({ coverNote: 'Keen to join.' });

  test('apply copies the resume, starts the history and bumps the count', async () => {
    const res = await apply().expect(201);
    expect(res.body.data.status).toBe('applied');
    expect(res.body.data.resumeUrl).toMatch(/\.pdf$/);
    expect(res.body.data.history).toHaveLength(1);
    expect((await Job.findById(job._id)).applicantCount).toBe(1);
  });

  test('a seeker cannot apply to the same job twice, even with two requests at once', async () => {
    const [a, b] = await Promise.all([apply(), apply()]);
    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect([a, b].find((r) => r.status === 409).body.error.code).toBe('DUPLICATE_APPLICATION');
    await apply().expect(409);
  });

  test('a closed job cannot receive applications', async () => {
    await api()
      .patch(`/api/v1/jobs/${job._id}/status`)
      .set(recruiter.auth)
      .send({ status: 'closed' })
      .expect(200);
    const res = await apply().expect(400);
    expect(res.body.error.code).toBe('JOB_CLOSED');
  });

  test('applying needs a resume', async () => {
    const bare = await signUp('seeker');
    const res = await apply(bare).expect(400);
    expect(res.body.error.code).toBe('RESUME_REQUIRED');
  });

  test('recruiters cannot apply', async () => {
    await apply(recruiter).expect(403);
  });

  test('recruiter moves an applicant through the pipeline; every move is in the history', async () => {
    const appId = (await apply().expect(201)).body.data._id;
    const move = (status) =>
      api().patch(`/api/v1/applications/${appId}/status`).set(recruiter.auth).send({ status });

    await move('shortlisted').expect(200);
    await move('interview').expect(200);
    const hired = await move('hired').expect(200);
    expect(hired.body.data.history.map((h) => h.status)).toEqual([
      'applied',
      'shortlisted',
      'interview',
      'hired',
    ]);

    const mine = await api().get('/api/v1/applications/me').set(seeker.auth).expect(200);
    expect(mine.body.data[0].status).toBe('hired');
    expect(mine.body.data[0].recruiterNotes).toBeUndefined();
  });

  test('an invalid status move (rejected -> hired) is refused', async () => {
    const appId = (await apply().expect(201)).body.data._id;
    await api()
      .patch(`/api/v1/applications/${appId}/status`)
      .set(recruiter.auth)
      .send({ status: 'rejected' })
      .expect(200);
    const res = await api()
      .patch(`/api/v1/applications/${appId}/status`)
      .set(recruiter.auth)
      .send({ status: 'hired' })
      .expect(400);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  test("a recruiter gets 403 on another recruiter's applicants", async () => {
    const appId = (await apply().expect(201)).body.data._id;
    const other = await recruiterWithCompany('Other Co');
    await api().get(`/api/v1/jobs/${job._id}/applications`).set(other.auth).expect(403);
    await api()
      .patch(`/api/v1/applications/${appId}/status`)
      .set(other.auth)
      .send({ status: 'shortlisted' })
      .expect(403);
    await api()
      .patch(`/api/v1/applications/${appId}/notes`)
      .set(other.auth)
      .send({ notes: 'x' })
      .expect(403);
  });

  test('applicant list shows skill match and private notes to the owner, filtered by status', async () => {
    const appId = (await apply().expect(201)).body.data._id;
    await api()
      .patch(`/api/v1/applications/${appId}/notes`)
      .set(recruiter.auth)
      .send({ notes: 'Strong CSS portfolio' })
      .expect(200);

    const res = await api()
      .get(`/api/v1/jobs/${job._id}/applications`)
      .set(recruiter.auth)
      .expect(200);
    expect(res.body.data[0].match).toEqual({ matched: 2, total: 3, skills: ['react', 'css'] });
    expect(res.body.data[0].recruiterNotes).toBe('Strong CSS portfolio');

    const none = await api()
      .get(`/api/v1/jobs/${job._id}/applications?status=hired`)
      .set(recruiter.auth)
      .expect(200);
    expect(none.body.data).toHaveLength(0);
  });

  test('seeker can withdraw their own application but not someone else’s', async () => {
    const appId = (await apply().expect(201)).body.data._id;
    const other = await seekerWithResume();
    await api().patch(`/api/v1/applications/${appId}/withdraw`).set(other.auth).expect(403);
    const res = await api()
      .patch(`/api/v1/applications/${appId}/withdraw`)
      .set(seeker.auth)
      .expect(200);
    expect(res.body.data.status).toBe('withdrawn');
    await api().patch(`/api/v1/applications/${appId}/withdraw`).set(seeker.auth).expect(400);
  });

  test('recruiter stats aggregate statuses and the last 30 days', async () => {
    await apply().expect(201);
    const res = await api().get('/api/v1/recruiter/stats').set(recruiter.auth).expect(200);
    expect(res.body.data.applications).toEqual({ total: 1, byStatus: { applied: 1 } });
    expect(res.body.data.perDay).toHaveLength(30);
    expect(res.body.data.perDay.at(-1).count).toBe(1);
    expect(res.body.data.jobs).toEqual({ total: 1, open: 1 });
  });

  test('recommended jobs rank by skill match', async () => {
    await postJob(recruiter, { title: 'CSS Specialist', skills: ['css', 'react'] });
    await postJob(recruiter, { title: 'Go Engineer', skills: ['go'] });
    const res = await api().get('/api/v1/jobs/recommended').set(seeker.auth).expect(200);
    expect(res.body.data.map((j) => j.title)).toEqual([
      'CSS Specialist',
      'Frontend Engineer (React)',
    ]);
  });
});
