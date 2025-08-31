import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 1: Auth & Family', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let secondParentEmail = `co_${Date.now()}@example.com`;

  it('allows parent sign-in via mocked Google and optional family creation', async () => {
    const res = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'parent@example.com', familyName: 'The Cherries', timezone: 'America/Los_Angeles' })
      .expect(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user.email', 'parent@example.com');
    expect(res.body.familyId).toBeTruthy();
    parentToken = res.body.token;
    familyId = res.body.familyId;
  });

  it('creates a family via API (parent only)', async () => {
    const res = await request(app)
      .post('/families')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: 'Another Fam', timezone: 'UTC' })
      .expect(201);
    expect(res.body).toHaveProperty('id');
  });

  it('allows parent to create a child account in the family', async () => {
    const res = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'kiddo', password: 'pw', displayName: 'Kid Cherry' })
      .expect(201);
    expect(res.body).toMatchObject({ username: 'kiddo', displayName: 'Kid Cherry', familyId });
  });

  it('allows child login with username/password', async () => {
    const res = await request(app)
      .post('/auth/child/login')
      .send({ username: 'kiddo', password: 'pw' })
      .expect(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('child.username', 'kiddo');
  });

  it('returns current user via /me', async () => {
    const res = await request(app)
      .get('/me')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('email', 'parent@example.com');
    expect(Array.isArray(res.body.families)).toBe(true);
  });

  it('lists families for parent and allows updating timezone', async () => {
    const list = await request(app)
      .get('/families')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.find((f: any) => f.id === familyId)).toBeTruthy();

    const patched = await request(app)
      .patch(`/families/${familyId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ timezone: 'UTC' })
      .expect(200);
    expect(patched.body.timezone).toBe('UTC');
  });

  it('lists children for a family (parent only)', async () => {
    const res = await request(app)
      .get(`/families/${familyId}/children`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('username', 'kiddo');
  });

  it('adds a co-parent to the family', async () => {
    const res = await request(app)
      .post(`/families/${familyId}/parents`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ email: secondParentEmail, name: 'Co Parent' })
      .expect(201);
    expect(res.body).toHaveProperty('ok', true);
    const fam = await request(app)
      .get(`/families/${familyId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(Array.isArray(fam.body.parentIds)).toBe(true);
    expect(fam.body.parentIds.length).toBeGreaterThan(1);

    const plist = await request(app)
      .get(`/families/${familyId}/parents`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(Array.isArray(plist.body)).toBe(true);
    expect(plist.body.find((p: any) => p.email === secondParentEmail)).toBeTruthy();
  });

  it('returns 401 on /me without auth', async () => {
    await request(app).get('/me').expect(401);
  });

  it('returns 404 when fetching unknown family', async () => {
    await request(app)
      .get('/families/does-not-exist')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);
  });

  it('forbids updating a family by non-member parent', async () => {
    const other = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'other@example.com' })
      .expect(200);
    await request(app)
      .patch(`/families/${familyId}`)
      .set('Authorization', `Bearer ${other.body.token}`)
      .send({ name: 'X' })
      .expect(403);
  });

  it('validates co-parent addition (missing email)', async () => {
    await request(app)
      .post(`/families/${familyId}/parents`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({})
      .expect(400);
  });

  it('returns 404 for children list on unknown family', async () => {
    await request(app)
      .get('/families/unknown/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(404);
  });

  it('rejects duplicate child username', async () => {
    await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'kiddo', password: 'pw', displayName: 'Dup' })
      .expect(409);
  });

  it('updates child display name and then deletes child', async () => {
    // find child id from list
    const list1 = await request(app)
      .get(`/families/${familyId}/children`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    const childId = list1.body[0].id as string;

    // update
    const up = await request(app)
      .patch(`/children/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ displayName: 'Updated Kid' })
      .expect(200);
    expect(up.body.displayName).toBe('Updated Kid');

    // delete
    await request(app)
      .delete(`/children/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(204);

    const list2 = await request(app)
      .get(`/families/${familyId}/children`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);
    expect(list2.body.length).toBe(0);
  });

  it('validates family create missing fields', async () => {
    await request(app)
      .post('/families')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ name: '' })
      .expect(400);
  });

  it('validates child create missing fields', async () => {
    await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({})
      .expect(400);
  });

  it('rejects child login with wrong password', async () => {
    await request(app)
      .post('/auth/child/login')
      .send({ username: 'kiddo', password: 'wrong' })
      .expect(401);
  });

  it('rejects parent callback without idToken', async () => {
    await request(app).post('/auth/google/callback').send({}).expect(400);
  });
});
