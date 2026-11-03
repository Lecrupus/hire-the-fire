const { api, signUp } = require('./helpers');
const User = require('../src/models/User');

describe('auth', () => {
  test('register returns a token, sets an httpOnly refresh cookie and never returns the hash', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Ananya Rao', email: 'Ananya@Test.dev', password: 'Passw0rd!', role: 'seeker' })
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBe('ananya@test.dev');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/htf_refresh=.*HttpOnly/);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  test('register rejects invalid input with 400 and field details', async () => {
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'nope', password: 'short', role: 'admin' })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(1);
  });

  test('cannot self-register as admin', async () => {
    await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Eve', email: 'eve@test.dev', password: 'Passw0rd!', role: 'admin' })
      .expect(400);
  });

  test('duplicate email is 409', async () => {
    await signUp('seeker', { email: 'dup@test.dev' });
    const res = await api()
      .post('/api/v1/auth/register')
      .send({ name: 'Dup', email: 'dup@test.dev', password: 'Passw0rd!', role: 'seeker' })
      .expect(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('login succeeds with the right password and fails with the same message otherwise', async () => {
    await signUp('recruiter', { email: 'r@test.dev' });
    await api()
      .post('/api/v1/auth/login')
      .send({ email: 'r@test.dev', password: 'Passw0rd!' })
      .expect(200);
    const wrong = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'r@test.dev', password: 'nope1234' })
      .expect(401);
    const unknown = await api()
      .post('/api/v1/auth/login')
      .send({ email: 'x@test.dev', password: 'nope1234' })
      .expect(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  test('refresh issues a new access token from the cookie', async () => {
    const { cookie } = await signUp();
    const res = await api().post('/api/v1/auth/refresh').set('Cookie', cookie).expect(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  test('refresh without a cookie is 401', async () => {
    await api().post('/api/v1/auth/refresh').expect(401);
  });

  test('a blocked user is refused on refresh and on protected routes', async () => {
    const s = await signUp();
    await User.updateOne({ _id: s.user._id }, { isBlocked: true });
    await api().post('/api/v1/auth/refresh').set('Cookie', s.cookie).expect(403);
    await api().get('/api/v1/users/me').set(s.auth).expect(403);
  });

  test('logout everywhere invalidates old refresh tokens', async () => {
    const s = await signUp();
    await api().post('/api/v1/auth/logout?everywhere=true').set(s.auth).expect(200);
    await api().post('/api/v1/auth/refresh').set('Cookie', s.cookie).expect(401);
  });

  test('protected routes need a valid token', async () => {
    await api().get('/api/v1/users/me').expect(401);
    const res = await api()
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer not-a-token')
      .expect(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  test('health check and unknown routes', async () => {
    await api().get('/api/v1/health').expect(200);
    const res = await api().get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
