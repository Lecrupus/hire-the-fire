const { api, signUp, recruiterWithCompany, postJob, PDF } = require('./helpers');

describe('users, companies, uploads and admin', () => {
  test('update profile and read it back', async () => {
    const s = await signUp();
    await api()
      .patch('/api/v1/users/me')
      .set(s.auth)
      .send({
        name: 'Ananya Rao',
        profile: {
          headline: 'React dev',
          skills: ['React', 'react', 'CSS'],
          links: { github: 'https://github.com/ananya' },
        },
      })
      .expect(200);
    const me = (await api().get('/api/v1/users/me').set(s.auth).expect(200)).body.data;
    expect(me.name).toBe('Ananya Rao');
    expect(me.profile.skills).toEqual(['react', 'css']);
    expect(me.profile.links.github).toBe('https://github.com/ananya');
  });

  test('resume upload accepts PDF only and checks the contents', async () => {
    const s = await signUp();
    await api()
      .post('/api/v1/users/me/resume')
      .set(s.auth)
      .attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(201);
    await api()
      .post('/api/v1/users/me/resume')
      .set(s.auth)
      .attach('resume', Buffer.from('hello'), { filename: 'cv.txt', contentType: 'text/plain' })
      .expect(400);
    await api()
      .post('/api/v1/users/me/resume')
      .set(s.auth)
      .attach('resume', Buffer.from('MZ fake'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
    const big = Buffer.concat([PDF, Buffer.alloc(2 * 1024 * 1024)]);
    const res = await api()
      .post('/api/v1/users/me/resume')
      .set(s.auth)
      .attach('resume', big, { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(400);
    expect(res.body.error.message).toMatch(/2 MB/);
  });

  test('saved jobs: save, list, unsave', async () => {
    const r = await recruiterWithCompany();
    const job = await postJob(r);
    const s = await signUp();
    await api().post(`/api/v1/users/me/saved/${job._id}`).set(s.auth).expect(201);
    await api().post(`/api/v1/users/me/saved/${job._id}`).set(s.auth).expect(201); // idempotent
    expect(
      (await api().get('/api/v1/users/me/saved').set(s.auth).expect(200)).body.data,
    ).toHaveLength(1);
    await api().delete(`/api/v1/users/me/saved/${job._id}`).set(s.auth).expect(200);
    expect(
      (await api().get('/api/v1/users/me/saved').set(s.auth).expect(200)).body.data,
    ).toHaveLength(0);
  });

  test('a recruiter has one company and only the owner can edit it', async () => {
    const r = await recruiterWithCompany('Kestrel Labs');
    await api().post('/api/v1/companies').set(r.auth).send({ name: 'Second Co' }).expect(409);
    const other = await recruiterWithCompany('Other Co');
    await api()
      .patch(`/api/v1/companies/${r.company._id}`)
      .set(other.auth)
      .send({ name: 'Mine now' })
      .expect(403);

    const job = await postJob(r);
    await api()
      .patch(`/api/v1/companies/${r.company._id}`)
      .set(r.auth)
      .send({ name: 'Kestrel Labs India' })
      .expect(200);
    expect((await api().get(`/api/v1/jobs/${job._id}`).expect(200)).body.data.companyName).toBe(
      'Kestrel Labs India',
    );
  });

  test('logo upload accepts PNG', async () => {
    const r = await recruiterWithCompany();
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const res = await api()
      .post(`/api/v1/companies/${r.company._id}/logo`)
      .set(r.auth)
      .attach('logo', png, { filename: 'l.png', contentType: 'image/png' })
      .expect(201);
    expect(res.body.data.logoUrl).toMatch(/\.png$/);
  });

  test('admin lists users, blocks one and reads platform stats; others get 403', async () => {
    const a = await signUp('admin');
    const login = await api()
      .post('/api/v1/auth/login')
      .send({ email: a.user.email, password: 'Passw0rd!' });
    const adminAuth = { Authorization: `Bearer ${login.body.data.accessToken}` };
    const s = await signUp();

    await api().get('/api/v1/admin/users').set(s.auth).expect(403);
    const users = (await api().get('/api/v1/admin/users?role=seeker').set(adminAuth).expect(200))
      .body.data;
    expect(users.total).toBe(1);

    await api()
      .patch(`/api/v1/admin/users/${s.user._id}/block`)
      .set(adminAuth)
      .send({ blocked: true })
      .expect(200);
    await api().get('/api/v1/users/me').set(s.auth).expect(403);
    await api()
      .patch(`/api/v1/admin/users/${a.user._id}/block`)
      .set(adminAuth)
      .send({ blocked: true })
      .expect(400);

    const stats = (await api().get('/api/v1/admin/stats').set(adminAuth).expect(200)).body.data;
    expect(stats.users).toBe(2);
    expect((await api().get('/api/v1/admin/jobs').set(adminAuth).expect(200)).body.data.total).toBe(
      0,
    );
  });
});
