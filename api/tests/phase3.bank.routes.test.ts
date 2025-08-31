import request from 'supertest';
import { createApp } from '../src/app';

describe('Phase 3: Bank routes', () => {
  const app = createApp();
  let parentToken = '';
  let familyId = '';
  let childId = '';

  it('setup: parent, family, child and child login', async () => {
    const p = await request(app)
      .post('/auth/google/callback')
      .send({ idToken: 'bankparent@example.com', familyName: 'BankFam', timezone: 'UTC' })
      .expect(200);
    parentToken = p.body.token;
    familyId = p.body.familyId;
    const c = await request(app)
      .post('/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ familyId, username: 'bankkid', password: 'pw', displayName: 'Bank Kid' })
      .expect(201);
    childId = c.body.id;
  });

  it('GET /bank/:childId returns balance and entries', async () => {
    const res = await request(app).get(`/bank/${childId}`).expect(200);
    expect(res.body).toHaveProperty('balance');
    expect(res.body.balance).toHaveProperty('available', 0);
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('parent can adjust balance (credit and debit)', async () => {
    await request(app).post(`/bank/${childId}/adjust`).set('Authorization', `Bearer ${parentToken}`).send({ amount: 5, note: 'bonus' }).expect(201);
    await request(app).post(`/bank/${childId}/adjust`).set('Authorization', `Bearer ${parentToken}`).send({ amount: -2, note: 'correction' }).expect(201);
    const res = await request(app).get(`/bank/${childId}`).expect(200);
    expect(res.body.balance.available).toBe(3);
  });

  it('validation and auth for adjustments', async () => {
    await request(app).post(`/bank/${childId}/adjust`).set('Authorization', `Bearer ${parentToken}`).send({ amount: 0 }).expect(400);
    await request(app).post(`/bank/${childId}/adjust`).set('Authorization', `Bearer ${parentToken}`).send({}).expect(400);
    // other non-member parent
    const other = await request(app).post('/auth/google/callback').send({ idToken: 'otherbank@example.com' }).expect(200);
    await request(app).post(`/bank/${childId}/adjust`).set('Authorization', `Bearer ${other.body.token}`).send({ amount: 1 }).expect(403);
  });

  it('child can record a spend; parent can also record spend', async () => {
    // child login
    const login = await request(app).post('/auth/child/login').send({ username: 'bankkid', password: 'pw' }).expect(200);
    const childToken = login.body.token;
    await request(app).post(`/bank/${childId}/spend`).set('Authorization', `Bearer ${childToken}`).send({ amount: 1, note: 'candy' }).expect(201);
    await request(app).post(`/bank/${childId}/spend`).set('Authorization', `Bearer ${parentToken}`).send({ amount: 1, note: 'parent spend' }).expect(201);
    const res = await request(app).get(`/bank/${childId}`).expect(200);
    // previous balance 3, minus 2 => 1
    expect(res.body.balance.available).toBe(1);
  });

  it('rejects spend when insufficient funds (child and parent)', async () => {
    // balance is currently 1 from previous test; try to spend 5
    const childLogin = await request(app).post('/auth/child/login').send({ username: 'bankkid', password: 'pw' }).expect(200);
    const childToken = childLogin.body.token;
    await request(app).post(`/bank/${childId}/spend`).set('Authorization', `Bearer ${childToken}`).send({ amount: 5, note: 'too much' }).expect(400);
    await request(app).post(`/bank/${childId}/spend`).set('Authorization', `Bearer ${parentToken}`).send({ amount: 5, note: 'too much' }).expect(400);
  });
});
