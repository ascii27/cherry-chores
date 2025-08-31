import request from 'supertest';
import { createApp } from '../src/app';

describe('Me endpoint as child', () => {
  const app = createApp();
  let familyId = '';
  let childToken = '';

  it('setup: create parent/family and child then login as child', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'childmeparent@example.com', familyName: 'ChildMe', timezone: 'UTC' })
      .expect(200);
    familyId = p.body.familyId;
    await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${p.body.token}`)
      .send({ familyId, username: 'childme', password: 'pw', displayName: 'Child Me' })
      .expect(201);
    const login = await request(app).post('/auth/child/login').send({ username: 'childme', password: 'pw' }).expect(200);
    childToken = login.body.token;
  });

  it('returns child identity and familyId', async () => {
    const res = await request(app).get('/me').set('Authorization', `Bearer ${childToken}`).expect(200);
    expect(res.body).toHaveProperty('role', 'child');
    expect(res.body).toHaveProperty('familyId', familyId);
  });
});

