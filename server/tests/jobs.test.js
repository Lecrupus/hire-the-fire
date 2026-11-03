const { api, signUp, recruiterWithCompany, postJob, jobBody } = require('./helpers');

describe('jobs', () => {
  test('a recruiter needs a company before posting', async () => {
    const r = await signUp('recruiter');
    const res = await api().post('/api/v1/jobs').set(r.auth).send(jobBody()).expect(400);
    expect(res.body.error.code).toBe('COMPANY_REQUIRED');
  });

  test('seekers cannot post jobs', async () => {
    const s = await signUp('seeker');
    await api().post('/api/v1/jobs').set(s.auth).send(jobBody()).expect(403);
  });

  test('salary max below min is a validation error', async () => {
    const r = await recruiterWithCompany();
    await api()
      .post('/api/v1/jobs')
      .set(r.auth)
      .send(jobBody({ salaryMin: 2000000, salaryMax: 1000000 }))
      .expect(400);
  });

  test('create, edit, close and reopen own job', async () => {
    const r = await recruiterWithCompany();
    const job = await postJob(r);
    expect(job.companyName).toBe('Kestrel Labs');
    expect(job.skills).toEqual(['react', 'typescript', 'css']);

    const edited = await api()
      .patch(`/api/v1/jobs/${job._id}`)
      .set(r.auth)
      .send({ title: 'Senior Frontend Engineer' })
      .expect(200);
    expect(edited.body.data.title).toBe('Senior Frontend Engineer');
    expect(
      (
        await api()
          .patch(`/api/v1/jobs/${job._id}/status`)
          .set(r.auth)
          .send({ status: 'closed' })
          .expect(200)
      ).body.data.status,
    ).toBe('closed');
    expect(
      (
        await api()
          .patch(`/api/v1/jobs/${job._id}/status`)
          .set(r.auth)
          .send({ status: 'open' })
          .expect(200)
      ).body.data.status,
    ).toBe('open');
  });

  test("a recruiter gets 403 on another recruiter's job", async () => {
    const owner = await recruiterWithCompany('Owner Co');
    const other = await recruiterWithCompany('Other Co');
    const job = await postJob(owner);
    await api()
      .patch(`/api/v1/jobs/${job._id}`)
      .set(other.auth)
      .send({ title: 'Hijacked' })
      .expect(403);
    await api()
      .patch(`/api/v1/jobs/${job._id}/status`)
      .set(other.auth)
      .send({ status: 'closed' })
      .expect(403);
    await api().delete(`/api/v1/jobs/${job._id}`).set(other.auth).expect(403);
    await api().get(`/api/v1/jobs/${job._id}/applications`).set(other.auth).expect(403);
  });

  test('drafts are hidden from the public and from search', async () => {
    const r = await recruiterWithCompany();
    const draft = await postJob(r, { status: 'draft' });
    await api().get(`/api/v1/jobs/${draft._id}`).expect(404);
    await api().get(`/api/v1/jobs/${draft._id}`).set(r.auth).expect(200);
    expect((await api().get('/api/v1/jobs').expect(200)).body.data.total).toBe(0);
  });

  test('bad ids are 400 and missing ids are 404', async () => {
    await api().get('/api/v1/jobs/not-an-id').expect(400);
    await api().get('/api/v1/jobs/64b7f0c2a1b2c3d4e5f60718').expect(404);
  });

  test('search: keyword, filters, sort and pagination', async () => {
    const r = await recruiterWithCompany('Kestrel Labs');
    await postJob(r, {
      title: 'React Developer',
      skills: ['react'],
      location: 'Mumbai',
      salaryMin: 600000,
      salaryMax: 900000,
    });
    await postJob(r, {
      title: 'Node Backend Engineer',
      skills: ['node.js', 'mongodb'],
      location: 'Pune',
      remote: true,
      salaryMin: 1500000,
      salaryMax: 2500000,
    });
    await postJob(r, {
      title: 'Data Analyst Intern',
      jobType: 'internship',
      skills: ['sql'],
      location: 'Mumbai',
      salaryMin: 200000,
      salaryMax: 300000,
      experienceMin: 0,
      experienceMax: 1,
    });

    const q = async (qs) => (await api().get(`/api/v1/jobs?${qs}`).expect(200)).body.data;

    expect((await q('q=react')).items.map((j) => j.title)).toEqual(['React Developer']);
    expect((await q('q=kestrel')).total).toBe(3); // company name is searchable
    expect((await q('location=mumbai')).total).toBe(2);
    expect((await q('remote=true')).items[0].title).toBe('Node Backend Engineer');
    expect((await q('jobType=internship')).total).toBe(1);
    expect((await q('salaryMin=1000000')).total).toBe(1);
    expect((await q('experience=0')).items.map((j) => j.title)).toEqual(['Data Analyst Intern']);
    expect((await q('sort=-salaryMax')).items[0].title).toBe('Node Backend Engineer');

    const page2 = await q('limit=2&page=2');
    expect(page2).toMatchObject({ page: 2, limit: 2, total: 3, pages: 2 });
    expect(page2.items).toHaveLength(1);
  });

  test('invalid search params are 400', async () => {
    await api().get('/api/v1/jobs?limit=500').expect(400);
    await api().get('/api/v1/jobs?jobType=freelance').expect(400);
  });

  test('$ operators in queries are stripped', async () => {
    const res = await api().get('/api/v1/jobs?location[$ne]=x').expect(400);
    expect(res.body.success).toBe(false);
  });

  test('recruiter job list includes per-status counts', async () => {
    const r = await recruiterWithCompany();
    await postJob(r);
    const res = await api().get('/api/v1/recruiter/jobs').set(r.auth).expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].statusCounts).toEqual({});
  });

  test('admin can remove any job', async () => {
    const r = await recruiterWithCompany();
    const a = await signUp('admin');
    const job = await postJob(r);
    // fresh login so the token reflects the promoted role
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: a.user.email, password: 'Passw0rd!' });
    await api()
      .delete(`/api/v1/jobs/${job._id}`)
      .set('Authorization', `Bearer ${login.body.data.accessToken}`)
      .expect(200);
    await api().get(`/api/v1/jobs/${job._id}`).expect(404);
  });
});
